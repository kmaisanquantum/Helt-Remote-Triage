'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { STATUS_CONFIG, formatCurrency, formatDate, timeAgo, initials, formatBytes, AVATAR_COLORS } from '@/lib/utils';
import type { Client, Contact, Note } from '@/lib/types';

interface Props {
  client: Client;
  initialContacts: Contact[];
  initialNotes: Note[];
  userId: string;
}

type Tab = 'overview' | 'contacts' | 'notes';

export function ClientDetail({ client: initialClient, initialContacts, initialNotes, userId }: Props) {
  const router = useRouter();
  const [client, setClient]     = useState(initialClient);
  const [contacts, setContacts] = useState(initialContacts);
  const [notes, setNotes]       = useState(initialNotes);
  const [tab, setTab]           = useState<Tab>('overview');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [editForm, setEditForm] = useState({ ...initialClient });

  /* ── Note composer ── */
  const [noteBody, setNoteBody]       = useState('');
  const [noteFile, setNoteFile]       = useState<File | null>(null);
  const [postingNote, setPostingNote] = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Contact modal ── */
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ first_name:'', last_name:'', email:'', phone:'', role:'', is_primary: false });
  const [savingContact, setSavingContact] = useState(false);

  const sc = STATUS_CONFIG[client.status];

  /* ── Save client edits ── */
  const saveClient = async () => {
    setSaving(true); setError('');
    const sb = getSupabaseBrowser();
    const { data, error: err } = await sb.from('clients')
      .update({ company: editForm.company, industry: editForm.industry, website: editForm.website, status: editForm.status, value: Number(editForm.value), currency: editForm.currency, avatar_color: editForm.avatar_color })
      .eq('id', client.id).select('*').single();
    if (err) { setError(err.message); } else { setClient(data); setEditMode(false); }
    setSaving(false);
  };

  /* ── Delete client ── */
  const deleteClient = async () => {
    if (!confirm('Delete this client and all their data? This cannot be undone.')) return;
    await getSupabaseBrowser().from('clients').delete().eq('id', client.id);
    router.push('/clients');
  };

  /* ── Post note ── */
  const postNote = async () => {
    if (!noteBody.trim()) return;
    setPostingNote(true);
    const sb = getSupabaseBrowser();
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize: number | null = null;

    if (noteFile) {
      const path = `${userId}/${client.id}/${Date.now()}-${noteFile.name}`;
      const { error: upErr } = await sb.storage.from('crm-attachments').upload(path, noteFile);
      if (!upErr) { attachmentPath = path; attachmentName = noteFile.name; attachmentSize = noteFile.size; }
    }

    const { data, error: err } = await sb.from('notes').insert({
      client_id: client.id, author_id: userId,
      body: noteBody.trim(), pinned: false,
      attachment_path: attachmentPath, attachment_name: attachmentName, attachment_size: attachmentSize,
    }).select('*').single();

    if (!err && data) {
      setNotes(prev => [data, ...prev]);
      setNoteBody(''); setNoteFile(null);
    }
    setPostingNote(false);
  };

  /* ── Toggle pin ── */
  const togglePin = async (noteId: string, pinned: boolean) => {
    const sb = getSupabaseBrowser();
    await sb.from('notes').update({ pinned: !pinned }).eq('id', noteId);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, pinned: !pinned } : n).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  /* ── Delete note ── */
  const deleteNote = async (noteId: string, path: string | null) => {
    const sb = getSupabaseBrowser();
    if (path) await sb.storage.from('crm-attachments').remove([path]);
    await sb.from('notes').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  /* ── Get signed attachment URL ── */
  const openAttachment = async (path: string) => {
    const { data } = await getSupabaseBrowser().storage.from('crm-attachments').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  /* ── Save contact ── */
  const saveContact = async () => {
    if (!contactForm.first_name.trim()) return;
    setSavingContact(true);
    const sb = getSupabaseBrowser();
    const { data, error: err } = await sb.from('contacts').insert({
      client_id: client.id, owner_id: userId,
      first_name: contactForm.first_name.trim(), last_name: contactForm.last_name.trim(),
      email: contactForm.email.trim() || null, phone: contactForm.phone.trim() || null,
      role: contactForm.role.trim() || null, is_primary: contactForm.is_primary,
    }).select('*').single();
    if (!err && data) { setContacts(prev => [...prev, data]); setShowContactModal(false); setContactForm({ first_name:'', last_name:'', email:'', phone:'', role:'', is_primary: false }); }
    setSavingContact(false);
  };

  /* ── Delete contact ── */
  const deleteContact = async (id: string) => {
    await getSupabaseBrowser().from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setNoteFile(f);
  }, []);

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="client-avatar" style={{ width: 48, height: 48, borderRadius: 12, fontSize: '1rem', background: client.avatar_color }}>
            {initials(client.company)}
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{client.company}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span className="badge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                <span className="status-dot" style={{ background: sc.color }} />{sc.label}
              </span>
              {client.industry && <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{client.industry}</span>}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{formatCurrency(client.value, client.currency)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditMode(true); setTab('overview'); }}>Edit</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={deleteClient}>Delete</button>
        </div>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Tabs */}
        <div className="tabs">
          {(['overview','contacts','notes'] as Tab[]).map(t => (
            <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'contacts' && contacts.length > 0 && <span style={{ marginLeft: 5, fontSize: '0.7rem', opacity: 0.7 }}>({contacts.length})</span>}
              {t === 'notes' && notes.length > 0 && <span style={{ marginLeft: 5, fontSize: '0.7rem', opacity: 0.7 }}>({notes.length})</span>}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          editMode ? (
            <div className="card" style={{ padding: 24, maxWidth: 560 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Edit Client</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field"><label>Company Name</label>
                  <input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} />
                </div>
                <div className="field-row">
                  <div className="field"><label>Industry</label>
                    <input value={editForm.industry ?? ''} onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} />
                  </div>
                  <div className="field"><label>Status</label>
                    <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}>
                      {['lead','active','inactive','churned'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field"><label>Website</label>
                  <input value={editForm.website ?? ''} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
                </div>
                <div className="field-row">
                  <div className="field"><label>Deal Value</label>
                    <input type="number" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: Number(e.target.value) }))} />
                  </div>
                  <div className="field"><label>Currency</label>
                    <select value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}>
                      {['USD','EUR','GBP','AUD','CAD','JPY','PGK'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Colour</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {AVATAR_COLORS.map(c => (
                      <div key={c} onClick={() => setEditForm(f => ({ ...f, avatar_color: c }))}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: editForm.avatar_color === c ? '3px solid #fff' : '3px solid transparent', boxShadow: editForm.avatar_color === c ? `0 0 0 2px ${c}` : 'none' }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={saveClient}>
                    {saving ? <><span className="spinner" />Saving…</> : 'Save changes'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditMode(false); setEditForm({ ...client }); }}>Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 700 }}>
              {[
                { label: 'Company',    value: client.company },
                { label: 'Industry',   value: client.industry ?? '—' },
                { label: 'Status',     value: sc.label },
                { label: 'Website',    value: client.website ?? '—' },
                { label: 'Deal Value', value: formatCurrency(client.value, client.currency), mono: true },
                { label: 'Currency',   value: client.currency },
                { label: 'Created',    value: formatDate(client.created_at) },
                { label: 'Updated',    value: formatDate(client.updated_at) },
              ].map(row => (
                <div key={row.label} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 5 }}>{row.label}</div>
                  <div style={{ fontFamily: row.mono ? 'var(--mono)' : undefined, fontSize: '0.92rem', color: 'var(--text)' }}>{row.value}</div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Contacts Tab ── */}
        {tab === 'contacts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowContactModal(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                Add Contact
              </button>
            </div>
            {contacts.length === 0 ? (
              <div className="card"><div className="empty-state" style={{ padding: '36px 24px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <h3>No contacts yet</h3><p>Add the key people at this company.</p>
              </div></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
                {contacts.map(c => (
                  <div key={c.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0, background: 'var(--indigo)' }}>
                        {initials(`${c.first_name} ${c.last_name}`)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.first_name} {c.last_name}
                          {c.is_primary && <span className="badge" style={{ marginLeft: 6, background: 'var(--indigo-dim)', color: 'var(--indigo)', borderColor: 'rgba(99,102,241,0.3)', fontSize: '0.62rem' }}>Primary</span>}
                        </div>
                        {c.role  && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>{c.role}</div>}
                        {c.email && <div style={{ fontSize: '0.78rem', color: 'var(--indigo)', marginTop: 4 }}>{c.email}</div>}
                        {c.phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{c.phone}</div>}
                      </div>
                      <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => deleteContact(c.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Notes Tab ── */}
        {tab === 'notes' && (
          <div style={{ maxWidth: 680 }}>
            {/* Composer */}
            <div className="card" style={{ padding: 18, marginBottom: 18 }}>
              <textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder="Log a call, meeting, or update…"
                rows={3}
                style={{ marginBottom: 10 }}
              />
              <div
                className={`file-drop ${dragOver ? 'drag-over' : ''}`}
                style={{ padding: '12px 16px', marginBottom: 10 }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setNoteFile(e.target.files?.[0] ?? null)} />
                {noteFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', fontWeight: 600 }}>{noteFile.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>({formatBytes(noteFile.size)})</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setNoteFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1rem', lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round"/></svg>
                    Attach a file (optional) — click or drag
                  </p>
                )}
              </div>
              <button type="button" className="btn btn-primary btn-sm" disabled={!noteBody.trim() || postingNote} onClick={postNote}>
                {postingNote ? <><span className="spinner" />Posting…</> : 'Post Note'}
              </button>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <div className="card"><div className="empty-state" style={{ padding: '32px 24px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <h3>No notes yet</h3><p>Start logging activity above.</p>
              </div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notes.map(n => (
                  <div key={n.id} className={`note-card ${n.pinned ? 'pinned' : ''}`}>
                    <div className="note-body">{n.body}</div>
                    {n.attachment_name && n.attachment_path && (
                      <button type="button" onClick={() => openAttachment(n.attachment_path!)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-2)', fontFamily: 'inherit' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round"/></svg>
                        {n.attachment_name}
                        {n.attachment_size && <span style={{ color: 'var(--text-3)' }}>({formatBytes(n.attachment_size)})</span>}
                      </button>
                    )}
                    <div className="note-footer">
                      <span>{timeAgo(n.created_at)}</span>
                      <button type="button" onClick={() => togglePin(n.id, n.pinned)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: n.pinned ? 'var(--indigo)' : 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'inherit', fontWeight: 600 }}>
                        {n.pinned ? '📌 Pinned' : 'Pin'}
                      </button>
                      <button type="button" onClick={() => deleteNote(n.id, n.attachment_path)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: '0.72rem', fontFamily: 'inherit', marginLeft: 'auto' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showContactModal && (
        <div className="modal-backdrop" onClick={() => setShowContactModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Contact</h2>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowContactModal(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-row">
                <div className="field"><label>First Name *</label>
                  <input value={contactForm.first_name} onChange={e => setContactForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Jane" />
                </div>
                <div className="field"><label>Last Name</label>
                  <input value={contactForm.last_name} onChange={e => setContactForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
                </div>
              </div>
              <div className="field"><label>Role / Title</label>
                <input value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. CEO, Procurement Manager" />
              </div>
              <div className="field"><label>Email</label>
                <input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
              </div>
              <div className="field"><label>Phone</label>
                <input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
                <input type="checkbox" checked={contactForm.is_primary} onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))} style={{ width: 'auto' }} />
                Primary contact
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={savingContact || !contactForm.first_name.trim()} onClick={saveContact}>
                  {savingContact ? <><span className="spinner" />Saving…</> : 'Add Contact'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowContactModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
