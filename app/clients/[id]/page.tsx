import { redirect, notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { ClientDetail } from '@/components/ui/ClientDetail';

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: profile }, { data: client }, { data: contacts }, { data: notes }, { data: allClients }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('clients').select('*').eq('id', id).eq('owner_id', user.id).single(),
    sb.from('contacts').select('*').eq('client_id', id).order('is_primary', { ascending: false }),
    sb.from('notes').select('*').eq('client_id', id).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('clients').select('id').eq('owner_id', user.id),
  ]);

  if (!client) notFound();

  return (
    <div className="app-shell">
      <Sidebar userName={profile?.full_name ?? 'User'} userEmail={user.email ?? ''} avatarUrl={profile?.avatar_url} clientCount={allClients?.length ?? 0} />
      <div className="main-area">
        <ClientDetail
          client={client}
          initialContacts={contacts ?? []}
          initialNotes={notes ?? []}
          userId={user.id}
        />
      </div>
    </div>
  );
}
