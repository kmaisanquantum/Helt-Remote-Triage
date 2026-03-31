import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <style>{`
        .land { position: relative; z-index: 1; }
        nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 32px; border-bottom: 1px solid var(--border);
          background: rgba(14,15,20,0.85); backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 10;
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-gem {
          width: 32px; height: 32px; border-radius: 9px;
          background: linear-gradient(135deg, #ef4444, #f87171);
          display: grid; place-items: center;
          box-shadow: 0 0 16px rgba(239,68,68,0.35);
        }
        .nav-brand { font-size: 1.1rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }

        .hero { max-width: 820px; margin: 0 auto; padding: 96px 32px 64px; text-align: center; }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
          color: #f87171; font-size: 0.78rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 6px 14px; border-radius: 999px; margin-bottom: 28px;
        }
        .hero h1 {
          font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 800;
          letter-spacing: -0.05em; line-height: 1.05; color: var(--text);
          margin-bottom: 22px;
        }
        .hero h1 span { color: #ef4444; }
        .hero p { font-size: 1.1rem; color: var(--text-2); max-width: 600px; margin: 0 auto 36px; line-height: 1.6; }
        .hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        .features {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr));
          gap: 14px; max-width: 900px; margin: 0 auto 80px; padding: 0 32px;
        }
        .feat {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 22px;
        }
        .feat-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(239,68,68,0.1); display: grid; place-items: center;
          color: #ef4444; margin-bottom: 14px;
        }
        .feat h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; }
        .feat p  { font-size: 0.82rem; color: var(--text-3); line-height: 1.55; }
      `}</style>

      <div className="land">
        <nav>
          <div className="nav-logo">
            <div className="nav-gem">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="nav-brand">CarePNG</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/auth/login"  className="btn btn-ghost btn-sm">Sign in</Link>
            <Link href="/auth/signup" className="btn btn-primary btn-sm" style={{ background: '#ef4444', borderColor: '#ef4444' }}>Get started →</Link>
          </div>
        </nav>

        <div className="hero">
          <div className="hero-pill">
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
            Telehealth for Papua New Guinea
          </div>
          <h1>Better care for<br /><span>remote communities.</span></h1>
          <p>CarePNG provides a critical lifeline for rural health posts. Connect with specialists via triage and track essential medicine stock in real-time.</p>
          <div className="hero-cta">
            <Link href="/auth/signup" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
              Register Health Post
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link href="/auth/login" className="btn btn-ghost">Sign in</Link>
          </div>
        </div>

        <div className="features">
          {[
            { icon: '🏥', title: 'Post Management', desc: 'Manage health post staff, records, and location details.' },
            { icon: '🩺', title: 'Telehealth Triage', desc: 'Request specialist review for complex cases via text-based triage.' },
            { icon: '💊', title: 'Inventory Tracker', desc: 'Real-time monitoring of anti-malarials and vaccine stock levels.' },
            { icon: '📊', title: 'Central Reporting', desc: 'Automatic reporting to provincial authorities to prevent stock-outs.' },
          ].map(f => (
            <div key={f.title} className="feat">
              <div className="feat-icon" style={{ fontSize: '1.1rem' }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
