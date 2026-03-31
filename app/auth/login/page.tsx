'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    const { error: err } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:26 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#818cf8)', display:'grid', placeItems:'center', boxShadow:'0 0 16px rgba(99,102,241,0.35)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize:'1.1rem', fontWeight:700, letterSpacing:'-0.02em' }}>ClientCRM</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your workspace</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="auth-form">
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          <button type="button" className="btn btn-primary" style={{ width:'100%' }} disabled={loading} onClick={submit}>
            {loading ? <><span className="spinner"/>Signing in…</> : 'Sign in'}
          </button>
        </div>
        <p className="auth-footer">No account? <Link href="/auth/signup">Create one free</Link></p>
      </div>
    </div>
  );
}
