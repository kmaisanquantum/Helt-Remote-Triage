'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { AVATAR_COLORS, randomAvatarColor } from '@/lib/utils';

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company: '', industry: '', website: '', status: 'lead',
    value: '', currency: 'USD', avatar_color: randomAvatarColor(),
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.company.trim()) { setError('Company name is required.'); return; }
    setLoading(true);
    const sb = getSupabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const { data, error: err } = await sb.from('clients').insert({
      owner_id: user.id,
      company: form.company.trim(),
      industry: form.industry.trim() || null,
      website: form.website.trim() || null,
      status: form.status,
      value: parseFloat(form.value) || 0,
      currency: form.currency,
      avatar_color: form.avatar_color,
    }).select('id').single();

    if (err) { setError(err.message); setLoading(false); return; }
    router.push(`/clients/${data.id}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <Link href="/clients" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--text-3)', fontSize:'0.85rem', textDecoration:'none', marginBottom:24 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to clients
        </Link>

        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: 6 }}>New Client</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 26 }}>Add a company to your pipeline.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label>Company Name *</label>
              <input type="text" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corporation" />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Industry</label>
                <input type="text" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. SaaS, Finance" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Website</label>
              <input type="text" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://acme.com" />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Deal Value</label>
                <input type="number" min="0" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0" />
              </div>
              <div className="field">
                <label>Currency</label>
                <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {['USD','EUR','GBP','AUD','CAD','JPY','PGK'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Colour</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {AVATAR_COLORS.map(c => (
                  <div key={c} onClick={() => set('avatar_color', c)}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.avatar_color === c ? '3px solid #fff' : '3px solid transparent', boxShadow: form.avatar_color === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>

            <button type="button" className="btn btn-primary" style={{ marginTop: 4 }} disabled={loading} onClick={submit}>
              {loading ? <><span className="spinner" />Creating…</> : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                Create Client
              </>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
