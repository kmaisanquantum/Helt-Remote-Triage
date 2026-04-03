'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    if (!name.trim()) { setError('Full name is required.'); setLoading(false); return; }
    const { error: err } = await getSupabaseBrowser().auth.signUp({
      email, password, options: { data: { full_name: name.trim() } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:26 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#ef4444,#f87171)', display:'grid', placeItems:'center', boxShadow:'0 0 16px rgba(239,68,68,0.35)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize:'1.1rem', fontWeight:700, letterSpacing:'-0.02em' }}>Helt</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Start managing your posts today</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="auth-form">
          <div className="field">
            <label>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          <button type="button" className="btn btn-primary" style={{ width:'100%', background: '#ef4444', borderColor: '#ef4444' }} disabled={loading} onClick={submit}>
            {loading ? <><span className="spinner"/>Creating…</> : 'Create account'}
          </button>
        </div>
        <p className="auth-footer">Already have an account? <Link href="/auth/login" style={{ color: '#ef4444' }}>Sign in</Link></p>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Technical Support</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>Email: <b>wokman@dspng.tech</b></div>
            <div>Phone/WA: <b>(675) 8300 99881</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
