-- ================================================================
-- ClientCRM — Supabase Schema + RLS Policies + Storage
-- Run in Supabase SQL Editor
-- ================================================================

-- ── 1. PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  avatar_url    text,
  company_name  text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 2. CLIENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company       text NOT NULL,
  industry      text,
  website       text,
  status        text NOT NULL DEFAULT 'lead'
                  CHECK (status IN ('lead','active','inactive','churned')),
  value         numeric NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'USD',
  avatar_color  text NOT NULL DEFAULT '#6366f1',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_owner" ON public.clients FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ── 3. CONTACTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    text NOT NULL,
  last_name     text NOT NULL DEFAULT '',
  email         text,
  phone         text,
  role          text,
  avatar_url    text,
  is_primary    boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_owner" ON public.contacts FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ── 4. NOTES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id        uuid NOT NULL REFERENCES auth.users(id),
  body             text NOT NULL,
  pinned           boolean NOT NULL DEFAULT false,
  attachment_path  text,
  attachment_name  text,
  attachment_size  int,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_owner" ON public.notes FOR ALL
  USING (
    auth.uid() = author_id OR
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.owner_id = auth.uid())
  )
  WITH CHECK (auth.uid() = author_id);

-- ── 5. TRIGGERS ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER notes_updated_at   BEFORE UPDATE ON public.notes   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 6. INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_owner    ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_status   ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_contacts_client  ON public.contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_client     ON public.notes(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned     ON public.notes(pinned) WHERE pinned = true;

-- ── 7. STORAGE BUCKET POLICIES ──────────────────────────────────
-- Create bucket "crm-attachments" (private) in Supabase Dashboard first.

CREATE POLICY "storage_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'crm-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "storage_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'crm-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
