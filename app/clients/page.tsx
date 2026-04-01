import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { ClientsTable } from '@/components/ui/ClientsTable';
import type { Client } from '@/lib/types';

export default async function ClientsPage() {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: profile }, { data: clients }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('clients').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false }),
  ]);

  const all: Client[] = clients ?? [];

  return (
    <div className="app-shell">
      <Sidebar userName={profile?.full_name ?? 'User'} userEmail={user.email ?? ''} avatarUrl={profile?.avatar_url} postCount={all.length} />
      <div className="main-area">
        <div className="page-header">
          <div>
            <h1 className="page-title">Health Posts</h1>
            <p className="page-sub">{all.length} post{all.length !== 1 ? 's' : ''} in the network</p>
          </div>
          <Link href="/clients/new" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            Register Post
          </Link>
        </div>
        <div className="page-body">
          <ClientsTable initialPosts={all} />
        </div>
      </div>
    </div>
  );
}
