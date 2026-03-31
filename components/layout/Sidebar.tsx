'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { initials } from '@/lib/utils';

interface SidebarProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  clientCount?: number;
}

export function Sidebar({ userName, userEmail, avatarUrl, clientCount = 0 }: SidebarProps) {
  const path = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await getSupabaseBrowser().auth.signOut();
    router.push('/auth/login');
  };

  const nav = [
    {
      href: '/dashboard', label: 'Dashboard',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    },
    {
      href: '/clients', label: 'Clients', badge: clientCount > 0 ? clientCount : null,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>,
    },
    {
      href: '/clients/new', label: 'Add Client',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="sidebar-logo">
        <div className="logo-gem">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span className="logo-name">ClientCRM</span>
      </Link>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Workspace</div>
        {nav.map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href) && n.href !== '/clients/new') ? 'active' : ''}`}>
            {n.icon}
            {n.label}
            {n.badge != null && <span className="nav-badge">{n.badge}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">
            {avatarUrl ? <img src={avatarUrl} alt={userName} /> : initials(userName)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div className="user-name">{userName}</div>
            <div className="user-email">{userEmail}</div>
          </div>
        </div>
        <button onClick={signOut} className="nav-item" style={{ color: 'var(--text-4)', fontSize: '0.82rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
