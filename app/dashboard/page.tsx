import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { STATUS_CONFIG, formatCurrency, timeAgo, initials } from '@/lib/utils';
import type { Client } from '@/lib/types';

export default async function DashboardPage() {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: profile }, { data: clients }, { data: recentNotes }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('clients').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    sb.from('notes').select('*, client:clients(company,avatar_color)').eq('author_id', user.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const all: Client[] = clients ?? [];
  const totalValue = all.reduce((s, c) => s + (c.value || 0), 0);
  const activeCount = all.filter(c => c.status === 'active').length;
  const leadCount   = all.filter(c => c.status === 'lead').length;

  const name = profile?.full_name ?? user.email?.split('@')[0] ?? 'there';

  return (
    <div className="app-shell">
      <Sidebar userName={profile?.full_name ?? 'User'} userEmail={user.email ?? ''} avatarUrl={profile?.avatar_url} clientCount={all.length} />

      <div className="main-area">
        <div className="page-header">
          <div>
            <h1 className="page-title">Good to see you, {name.split(' ')[0]}.</h1>
            <p className="page-sub">Here's your client pipeline at a glance.</p>
          </div>
          <Link href="/clients/new" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            Add Client
          </Link>
        </div>

        <div className="page-body">
          {/* Stats */}
          <div className="stats-grid">
            {[
              { label: 'Total Clients',  value: all.length, sub: 'in your pipeline' },
              { label: 'Active',         value: activeCount, sub: 'clients', color: '#34d399' },
              { label: 'Open Leads',     value: leadCount,   sub: 'to convert',     color: '#818cf8' },
              { label: 'Pipeline Value', value: formatCurrency(totalValue), sub: 'total deal value', mono: true },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color: s.color ?? 'var(--text)', fontFamily: s.mono ? 'var(--mono)' : undefined, fontSize: s.mono ? '1.4rem' : undefined }}>
                  {s.value}
                </div>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
            {/* Recent clients */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h2 style={{ fontSize:'1rem', fontWeight:700, letterSpacing:'-0.02em' }}>Recent Clients</h2>
                <Link href="/clients" style={{ fontSize:'0.8rem', color:'var(--indigo)', textDecoration:'none', fontWeight:600 }}>View all →</Link>
              </div>
              <div className="card" style={{ overflow:'hidden', padding:0 }}>
                {all.length === 0 ? (
                  <div className="empty-state" style={{ padding:'32px 24px' }}>
                    <p>No clients yet. <Link href="/clients/new" style={{ color:'var(--indigo)' }}>Add your first →</Link></p>
                  </div>
                ) : all.slice(0, 6).map(c => {
                  const sc = STATUS_CONFIG[c.status];
                  return (
                    <Link key={c.id} href={`/clients/${c.id}`} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:'1px solid var(--border)', textDecoration:'none', transition:'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="client-avatar" style={{ background: c.avatar_color }}>
                        {initials(c.company)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="client-name">{c.company}</div>
                        <div className="client-meta">{c.industry ?? '—'}</div>
                      </div>
                      <span className="badge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                        <span className="status-dot" style={{ background: sc.color }} />{sc.label}
                      </span>
                      <span className="mono-val">{formatCurrency(c.value, c.currency)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Recent notes */}
            <div>
              <div style={{ marginBottom:12 }}>
                <h2 style={{ fontSize:'1rem', fontWeight:700, letterSpacing:'-0.02em' }}>Recent Activity</h2>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(recentNotes ?? []).length === 0 ? (
                  <div className="card" style={{ padding:'24px 16px', textAlign:'center' }}>
                    <p style={{ fontSize:'0.82rem', color:'var(--text-3)' }}>No notes yet.</p>
                  </div>
                ) : (recentNotes ?? []).map((n: any) => (
                  <Link key={n.id} href={`/clients/${n.client_id}`} style={{ textDecoration:'none' }}>
                    <div className="note-card" style={{ cursor:'pointer' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <div className="client-avatar" style={{ width:22, height:22, borderRadius:5, fontSize:'0.62rem', background: n.client?.avatar_color ?? '#6366f1', flexShrink:0 }}>
                          {initials(n.client?.company ?? '?')}
                        </div>
                        <span style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-2)' }}>{n.client?.company ?? 'Unknown'}</span>
                        <span style={{ fontSize:'0.7rem', color:'var(--text-3)', marginLeft:'auto' }}>{timeAgo(n.created_at)}</span>
                      </div>
                      <div className="note-body" style={{ fontSize:'0.82rem', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {n.body}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
