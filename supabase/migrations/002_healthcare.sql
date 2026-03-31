-- ── 1. MEDICINE INVENTORY ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  quantity      integer NOT NULL DEFAULT 0,
  unit          text NOT NULL DEFAULT 'doses',
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_owner" ON public.inventory FOR ALL
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = post_id AND c.owner_id = auth.uid()));

-- ── 2. ENHANCE NOTES FOR TRIAGE ──────────────────────────────────
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS type text DEFAULT 'general' CHECK (type IN ('general', 'triage', 'consultation'));
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency'));

-- ── 3. UPDATED AT TRIGGER ────────────────────────────────────────
CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_post ON public.inventory(post_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON public.notes(type);
