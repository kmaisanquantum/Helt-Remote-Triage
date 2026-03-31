'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Client, ClientStatus } from '@/lib/types';
import { STATUS_CONFIG, formatCurrency, formatDate, initials } from '@/lib/utils';

const ALL_STATUSES: ClientStatus[] = ['lead', 'active', 'inactive', 'churned'];

export function ClientsTable({ initialClients }: { initialClients: Client[] }) {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState<ClientStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return initialClients.filter(c => {
      const matchSearch = !search || c.company.toLowerCase().includes(search.toLowerCase()) || (c.industry ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === 'all' || c.status === status;
      return matchSearch && matchStatus;
    });
  }, [initialClients, search, status]);

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
          <input
            type="search"
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setStatus('all')} className={`btn btn-sm ${status === 'all' ? 'btn-primary' : 'btn-ghost'}`}>All</button>
          {ALL_STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className="btn btn-sm"
                style={{ background: status === s ? cfg.bg : 'var(--surface-2)', color: status === s ? cfg.color : 'var(--text-3)', border: `1px solid ${status === s ? cfg.border : 'var(--border)'}` }}>
                {cfg.label}
              </button>
            );
          })}
        </div>
        <div className="toolbar-right">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
            <h3>{initialClients.length === 0 ? 'No clients yet' : 'No matches found'}</h3>
            <p>{initialClients.length === 0 ? 'Add your first client to get started.' : 'Try adjusting your search or filter.'}</p>
            {initialClients.length === 0 && (
              <Link href="/clients/new" className="btn btn-primary" style={{ marginTop: 16 }}>Add first client</Link>
            )}
          </div>
        ) : (
          <table className="client-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Value</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sc = STATUS_CONFIG[c.status];
                return (
                  <tr key={c.id} onClick={() => window.location.href = `/clients/${c.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div className="client-avatar" style={{ background: c.avatar_color }}>{initials(c.company)}</div>
                        <div>
                          <div className="client-name">{c.company}</div>
                          {c.website && <div className="client-meta">{c.website.replace(/^https?:\/\//, '')}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{c.industry ?? '—'}</span></td>
                    <td>
                      <span className="badge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                        <span className="status-dot" style={{ background: sc.color }} />
                        {sc.label}
                      </span>
                    </td>
                    <td><span className="mono-val">{formatCurrency(c.value, c.currency)}</span></td>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{formatDate(c.created_at)}</span></td>
                    <td>
                      <Link href={`/clients/${c.id}`} className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
