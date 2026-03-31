# Helt

A production-ready, fullstack CRM SaaS built with **Next.js 15** + **Supabase**. Manage clients, contacts, notes, and file attachments in a beautiful dark interface.

## Features

- 🔐 **Auth** — Email/password sign-up and login via Supabase Auth
- 👤 **Client Profiles** — Company, industry, website, deal value, status pipeline
- 📇 **Contacts** — Multiple contacts per client with roles, email, phone
- 📝 **Notes** — Rich activity log with pinning support
- 📎 **File Attachments** — Upload any file to a note, stored in Supabase Storage
- 🔒 **Row-Level Security** — Every record is scoped to its owner
- 🏥 **Health Check** — `/api/health` monitors Supabase connectivity (used by Render)

## Tech Stack

| Layer     | Technology          |
|-----------|---------------------|
| Framework | Next.js 15 (App Router) |
| Database  | Supabase (PostgreSQL) |
| Auth      | Supabase Auth       |
| Storage   | Supabase Storage    |
| Hosting   | Render.com          |
| Fonts     | Outfit + Geist Mono |

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/clientcrm.git
cd clientcrm
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_schema.sql`
3. Go to **Storage** → create a **private** bucket named `crm-attachments`

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Render detects `render.yaml` automatically
4. Add your environment variables in the Render dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy — Render will build and serve the app

## Project Structure

```
clientcrm/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout + fonts
│   ├── globals.css               # Design system
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx        # Main dashboard
│   ├── clients/
│   │   ├── page.tsx              # Clients list
│   │   ├── new/page.tsx          # Create client
│   │   └── [id]/page.tsx         # Client detail
│   └── api/
│       └── health/route.ts       # Health check endpoint
├── components/
│   ├── layout/Sidebar.tsx
│   └── ui/
│       ├── ClientsTable.tsx      # Filterable client table
│       └── ClientDetail.tsx      # Tabbed client detail view
├── lib/
│   ├── supabase-browser.ts
│   ├── supabase-server.ts
│   ├── types.ts
│   └── utils.ts
├── supabase/migrations/
│   └── 001_schema.sql            # Full schema + RLS + storage policies
├── render.yaml                   # Render deployment config
└── .env.example
```

## License

MIT
