import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';
import { STATUS_CONFIG, timeAgo, initials } from '@/lib/utils';
import type { Client, ClientStatus } from '@/lib/types';

export default async function DashboardPage() {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: profile }, { data: posts }, { data: recentTriage }, { data: lowStock }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('clients').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    sb.from('notes').select('*, client:clients(company,avatar_color)').eq('author_id', user.id).eq('type', 'triage').order('created_at', { ascending: false }).limit(5),
    sb.from('inventory').select('*, post:clients(company)').lt('quantity', 10).limit(5),
  ]);

  const allPosts: Client[] = posts ?? [];
  const urgentCount = (recentTriage ?? []).filter((n: any) => n.urgency === 'urgent' || n.urgency === 'emergency').length;
  const activePosts = allPosts.filter(c => c.status === 'active').length;

  const name = profile?.full_name ?? user.email?.split('@')[0] ?? 'Provider';

  return (
    <div className="app-shell">
      <Sidebar userName={profile?.full_name ?? 'User'} userEmail={user.email ?? ''} avatarUrl={profile?.avatar_url} clientCount={allPosts.length} />

      <div className="main-area">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back, {name.split(' ')[0]}.</h1>
            <p className="page-sub">Monitoring the medical network in real-time.</p>
          </div>
          <Link href="/clients/new" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            Register Post
          </Link>
        </div>

        <div className="page-body">
          {/* Stats */}
          <div className="stats-grid">
            {[
              { label: 'Health Posts',  value: allPosts.length, sub: 'total in network' },
              { label: 'Operational',   value: activePosts,     sub: 'posts online', color: '#34d399' },
              { label: 'Urgent Triage', value: urgentCount,     sub: 'awaiting review', color: '#ef4444' },
              { label: 'Stock Alerts',  value: (lowStock ?? []).length, sub: 'items below threshold', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color: s.color ?? 'var(--text)' }}>
                  {s.value}
                </div>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
            {/* Recent Posts */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h2 style={{ fontSize:'1rem', fontWeight:700, letterSpacing:'-0.02em' }}>Recent Health Posts</h2>
                <Link href="/clients" style={{ fontSize:'0.8rem', color: '#ef4444', textDecoration:'none', fontWeight:600 }}>View network →</Link>
              </div>
              <div className="card" style={{ overflow:'hidden', padding:0 }}>
                {allPosts.length === 0 ? (
                  <div className="empty-state" style={{ padding:'32px 24px' }}>
                    <p>No health posts registered. <Link href="/clients/new" style={{ color:'#ef4444' }}>Register your first →</Link></p>
                  </div>
                ) : allPosts.slice(0, 6).map(c => {
                  const sc = STATUS_CONFIG[c.status as ClientStatus];
                  return (
                    <Link key={c.id} href={`/clients/${c.id}`} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:'1px solid var(--border)', textDecoration:'none', transition:'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="client-avatar" style={{ background: c.avatar_color }}>
                        {initials(c.company)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="client-name">{c.company}</div>
                        <div className="client-meta">{c.industry ?? 'General Clinic'}</div>
                      </div>
                      <span className="badge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                        <span className="status-dot" style={{ background: sc.color }} />{sc.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Inventory Alerts */}
            <div>
              <div style={{ marginBottom:12 }}>
                <h2 style={{ fontSize:'1rem', fontWeight:700, letterSpacing:'-0.02em' }}>Stock & Triage Alerts</h2>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {((lowStock ?? []).length === 0 && (recentTriage ?? []).length === 0) ? (
                  <div className="card" style={{ padding:'24px 16px', textAlign:'center' }}>
                    <p style={{ fontSize:'0.82rem', color:'var(--text-3)' }}>Network is stable. No active alerts.</p>
                  </div>
                ) : (
                  <>
                    {(lowStock ?? []).map((i: any) => (
                      <div key={i.id} className="note-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                         <div style={{ fontSize:'0.7rem', color:'#f59e0b', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Low Stock: {i.post?.company}</div>
                         <div style={{ fontSize:'0.85rem', fontWeight:600 }}>{i.medicine_name}: {i.quantity} {i.unit} remaining</div>
                      </div>
                    ))}
                    {(recentTriage ?? []).map((n: any) => (
                      <Link key={n.id} href={`/clients/${n.client_id}`} style={{ textDecoration:'none' }}>
                        <div className="note-card" style={{ borderLeft: n.urgency === 'urgent' || n.urgency === 'emergency' ? '3px solid #ef4444' : '3px solid #818cf8' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:'0.7rem', color: n.urgency === 'urgent' || n.urgency === 'emergency' ? '#ef4444' : '#818cf8', fontWeight:700, textTransform:'uppercase' }}>
                              {n.urgency} Triage: {n.client?.company}
                            </span>
                            <span style={{ fontSize:'0.7rem', color:'var(--text-3)', marginLeft:'auto' }}>{timeAgo(n.created_at)}</span>
                          </div>
                          <div className="note-body" style={{ fontSize:'0.82rem', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                            {n.body}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
