'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { STATUS_CONFIG, formatDate, timeAgo, initials, formatBytes, AVATAR_COLORS } from '@/lib/utils';
import type { Client, Contact, Note } from '@/lib/types';

interface Props {
  client: Client;
  initialContacts: Contact[];
  initialNotes: Note[];
  userId: string;
}

type Tab = 'overview' | 'contacts' | 'notes' | 'inventory';

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
  const [noteType, setNoteType]       = useState('general');
  const [noteUrgency, setNoteUrgency] = useState('routine');
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Contact modal ── */
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ first_name:'', last_name:'', email:'', phone:'', role:'', is_primary: false });
  const [savingContact, setSavingContact] = useState(false);

  /* ── Inventory ── */
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [newInv, setNewInv] = useState({ medicine_name: '', quantity: '0', unit: 'doses' });

  const sc = STATUS_CONFIG[client.status];

  useEffect(() => {
    if (tab === 'inventory') fetchInventory();
  }, [tab]);

  const fetchInventory = async () => {
    setLoadingInv(true);
    const { data } = await getSupabaseBrowser().from('inventory').select('*').eq('post_id', client.id).order('medicine_name');
    setInventory(data ?? []);
    setLoadingInv(false);
  };

  const addInventory = async () => {
    if (!newInv.medicine_name.trim()) return;
    const { data } = await getSupabaseBrowser().from('inventory').insert({
      post_id: client.id,
      medicine_name: newInv.medicine_name.trim(),
      quantity: parseInt(newInv.quantity) || 0,
      unit: newInv.unit
    }).select('*').single();
    if (data) {
      setInventory(prev => [...prev, data].sort((a, b) => a.medicine_name.localeCompare(b.medicine_name)));
      setNewInv({ medicine_name: '', quantity: '0', unit: 'doses' });
    }
  };

  const updateInvQty = async (id: string, qty: number) => {
    await getSupabaseBrowser().from('inventory').update({ quantity: qty }).eq('id', id);
    setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

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

  const deleteClient = async () => {
    if (!confirm('Delete this health post and all its data?')) return;
    await getSupabaseBrowser().from('clients').delete().eq('id', client.id);
    router.push('/clients');
  };

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
      type: noteType, urgency: noteUrgency
    }).select('*').single();

    if (!err && data) {
      setNotes(prev => [data, ...prev]);
      setNoteBody(''); setNoteFile(null); setNoteType('general'); setNoteUrgency('routine');
    }
    setPostingNote(false);
  };

  const togglePin = async (noteId: string, pinned: boolean) => {
    const sb = getSupabaseBrowser();
    await sb.from('notes').update({ pinned: !pinned }).eq('id', noteId);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, pinned: !pinned } : n).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const deleteNote = async (noteId: string, path: string | null) => {
    const sb = getSupabaseBrowser();
    if (path) await sb.storage.from('crm-attachments').remove([path]);
    await sb.from('notes').delete().eq('id', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const openAttachment = async (path: string) => {
    const { data } = await getSupabaseBrowser().storage.from('crm-attachments').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setNoteFile(file);
  };

  const saveContact = async () => {
    setSavingContact(true);
    const sb = getSupabaseBrowser();
    const { data, error: err } = await sb.from('contacts').insert({ ...contactForm, client_id: client.id, owner_id: userId }).select('*').single();
    if (!err && data) { setContacts(prev => [...prev, data]); setShowContactModal(false); setContactForm({ first_name:'', last_name:'', email:'', phone:'', role:'', is_primary: false }); }
    setSavingContact(false);
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await getSupabaseBrowser().from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <>
      {/* Header */}
      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="client-avatar large" style={{ background: client.avatar_color }}>
            {initials(client.company)}
          </div>
          <div>
            <h1 className="client-name-title">{client.company}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span className="badge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                <span className="status-dot" style={{ background: sc.color }} />
                {sc.label}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{client.industry || 'General Clinic'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setEditMode(true)}>Edit Post</button>
          <button className="btn btn-danger" onClick={deleteClient}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {['overview', 'inventory', 'notes', 'contacts'].map((t: any) => (
          <button key={t} type="button" className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="detail-content">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="overview-grid">
            <div className="card">
              <h3 className="card-title">Post Information</h3>
              <div className="info-list">
                <div className="info-item">
                  <label>Industry / Focus</label>
                  <div>{client.industry || '—'}</div>
                </div>
                <div className="info-item">
                  <label>Website / Portal</label>
                  <div>{client.website ? <a href={client.website} target="_blank" rel="noreferrer" style={{ color: '#ef4444' }}>{client.website.replace(/^https?:\/\//, '')}</a> : '—'}</div>
                </div>
                <div className="info-item">
                  <label>Network Entry</label>
                  <div>{formatDate(client.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {tab === 'inventory' && (
          <div style={{ maxWidth: 800 }}>
             <div className="card" style={{ padding: 18, marginBottom: 18 }}>
                <h3 className="card-title" style={{ marginBottom: 14 }}>Add Medicine Stock</h3>
                <div className="field-row">
                  <div className="field">
                    <label>Medicine Name</label>
                    <input value={newInv.medicine_name} onChange={e => setNewInv(p => ({ ...p, medicine_name: e.target.value }))} placeholder="e.g. Artemether/lumefantrine" />
                  </div>
                  <div className="field" style={{ flex: '0 0 100px' }}>
                    <label>Qty</label>
                    <input type="number" value={newInv.quantity} onChange={e => setNewInv(p => ({ ...p, quantity: e.target.value }))} />
                  </div>
                  <div className="field" style={{ flex: '0 0 120px' }}>
                    <label>Unit</label>
                    <input value={newInv.unit} onChange={e => setNewInv(p => ({ ...p, unit: e.target.value }))} placeholder="doses" />
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', paddingBottom: 2 }}>
                    <button className="btn btn-primary btn-sm" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={addInventory}>Add</button>
                  </div>
                </div>
             </div>

             <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50%' }}>Medicine</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInv ? (
                      <tr><td colSpan={4} style={{ textAlign:'center', padding: 32 }}>Loading inventory...</td></tr>
                    ) : inventory.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign:'center', padding: 32 }}>No medicine stock reported for this post.</td></tr>
                    ) : inventory.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.medicine_name}</td>
                        <td>
                           <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                              <button onClick={() => updateInvQty(item.id, Math.max(0, item.quantity - 1))} style={{ width:24, height:24, borderRadius:4, border:'1px solid var(--border)', background:'var(--surface-3)', cursor:'pointer', color:'var(--text)' }}>-</button>
                              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, color: item.quantity < 10 ? '#ef4444' : 'inherit' }}>{item.quantity}</span>
                              <button onClick={() => updateInvQty(item.id, item.quantity + 1)} style={{ width:24, height:24, borderRadius:4, border:'1px solid var(--border)', background:'var(--surface-3)', cursor:'pointer', color:'var(--text)' }}>+</button>
                           </div>
                        </td>
                        <td style={{ fontSize:'0.82rem', color:'var(--text-3)' }}>{item.unit}</td>
                        <td style={{ textAlign: 'right' }}>
                           {item.quantity < 10 && <span style={{ fontSize:'0.65rem', background:'rgba(239,68,68,0.1)', color:'#ef4444', padding:'2px 6px', borderRadius:4, fontWeight:700, marginRight: 8 }}>CRITICAL</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="card-title" style={{ margin: 0 }}>Staff & Contacts</h3>
              <button className="btn btn-primary btn-sm" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={() => setShowContactModal(true)}>Add Staff</button>
            </div>
            {contacts.length === 0 ? (
              <div className="card"><div className="empty-state" style={{ padding: '32px 24px' }}><h3>No staff listed</h3><p>Add medical personnel for this post.</p></div></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {contacts.map(c => (
                  <div key={c.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0, background: '#ef4444' }}>
                        {initials(`${c.first_name} ${c.last_name}`)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.first_name} {c.last_name}
                          {c.is_primary && <span className="badge" style={{ marginLeft: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', fontSize: '0.62rem' }}>Head</span>}
                        </div>
                        {c.role  && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>{c.role}</div>}
                        {c.email && <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4 }}>{c.email}</div>}
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

        {/* Notes Tab */}
        {tab === 'notes' && (
          <div style={{ maxWidth: 680 }}>
            {/* Composer */}
            <div className="card" style={{ padding: 18, marginBottom: 18 }}>
              <div style={{ display:'flex', gap: 10, marginBottom: 10 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Type</label>
                  <select value={noteType} onChange={e => setNoteType(e.target.value)}>
                    <option value="general">General Update</option>
                    <option value="triage">Telehealth Triage</option>
                    <option value="consultation">Specialist Consultation</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Urgency</label>
                  <select value={noteUrgency} onChange={e => setNoteUrgency(e.target.value)}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                placeholder="Log triage symptoms, specialist advice, or general updates…"
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', fontWeight: 600 }}>{noteFile.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>({formatBytes(noteFile.size)})</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setNoteFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1rem', lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round"/></svg>
                    Attach charts or photos (optional)
                  </p>
                )}
              </div>
              <button type="button" className="btn btn-primary btn-sm" style={{ background: '#ef4444', borderColor: '#ef4444' }} disabled={!noteBody.trim() || postingNote} onClick={postNote}>
                {postingNote ? <><span className="spinner" />Posting…</> : 'Post Update'}
              </button>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <div className="card"><div className="empty-state" style={{ padding: '32px 24px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <h3>No activity logs</h3><p>Start logging triage or updates above.</p>
              </div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notes.map((n: any) => (
                  <div key={n.id} className={`note-card ${n.pinned ? 'pinned' : ''}`} style={{ borderLeft: n.type === 'triage' ? `4px solid ${n.urgency === 'routine' ? '#818cf8' : '#ef4444'}` : undefined }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                       {n.type !== 'general' && (
                         <span style={{ fontSize: '0.62rem', background: n.type === 'triage' ? '#818cf8' : '#34d399', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                           {n.type}
                         </span>
                       )}
                       {n.urgency !== 'routine' && (
                         <span style={{ fontSize: '0.62rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                           {n.urgency}
                         </span>
                       )}
                    </div>
                    <div className="note-body">{n.body}</div>
                    {n.attachment_name && n.attachment_path && (
                      <button type="button" onClick={() => openAttachment(n.attachment_path!)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-2)', fontFamily: 'inherit', marginTop: 10 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round"/></svg>
                        {n.attachment_name}
                        {n.attachment_size && <span style={{ color: 'var(--text-3)' }}>({formatBytes(n.attachment_size)})</span>}
                      </button>
                    )}
                    <div className="note-footer">
                      <span>{timeAgo(n.created_at)}</span>
                      <button type="button" onClick={() => togglePin(n.id, n.pinned)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: n.pinned ? '#ef4444' : 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'inherit', fontWeight: 600 }}>
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

      {/* Add Staff Modal */}
      {showContactModal && (
        <div className="modal-backdrop" onClick={() => setShowContactModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Staff Member</h2>
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
              <div className="field"><label>Medical Role</label>
                <input value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Head Nurse, Community Health Worker" />
              </div>
              <div className="field"><label>Contact Email</label>
                <input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@post.gov.pg" />
              </div>
              <div className="field"><label>Radio / Phone</label>
                <input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="Channel or phone number" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
                <input type="checkbox" checked={contactForm.is_primary} onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))} style={{ width: 'auto' }} />
                Post Head
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn btn-primary" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }} disabled={savingContact || !contactForm.first_name.trim()} onClick={saveContact}>
                  {savingContact ? <><span className="spinner" />Saving…</> : 'Add Staff'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowContactModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editMode && (
        <div className="modal-backdrop" onClick={() => setEditMode(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Health Post</h2>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditMode(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Post Name</label>
                <input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="field">
                <label>Location / Focus</label>
                <input value={editForm.industry || ''} onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} />
              </div>
              <div className="field">
                <label>Operational Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="lead">Proposed</option>
                  <option value="active">Operational</option>
                  <option value="inactive">Suspended</option>
                  <option value="churned">Decommissioned</option>
                </select>
              </div>
              <div className="field">
                <label>Colour</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {AVATAR_COLORS.map(c => (
                    <div key={c} onClick={() => setEditForm(f => ({ ...f, avatar_color: c }))}
                      style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: editForm.avatar_color === c ? '2px solid #fff' : '2px solid transparent', boxShadow: editForm.avatar_color === c ? `0 0 0 2px ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn btn-primary" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }} disabled={saving} onClick={saveClient}>
                  {saving ? <><span className="spinner" />Saving…</> : 'Save Changes'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
