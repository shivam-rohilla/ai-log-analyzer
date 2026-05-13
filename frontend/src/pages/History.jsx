import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, Trash2, Eye, Search as SearchIcon, UploadCloud } from 'lucide-react';
import { getHistory, deleteAnalysis } from '../utils/storage';

function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function SummaryModal({ item, onClose }) {
  const { summary = {}, chunk_analyses = [], timeline = [], total_logs, errors, warnings, info } = item;
  const [tab, setTab] = useState('overview');

  return createPortal(
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <FileText size={18} style={{ color: 'var(--indigo-l)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{item.filename}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{fmt(item.analyzedAt)}</div>
          </div>
          <span className={`status-badge ${summary.status || 'healthy'}`} style={{ marginLeft: 'auto' }}>
            {summary.status || 'ok'}
          </span>
        </div>

        {/* Mini stats */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {[['Total', total_logs, ''], ['Errors', errors, 'var(--error)'], ['Warnings', warnings, 'var(--warn)'], ['Info', info, 'var(--info)']].map(([l, v, c]) => (
            <div key={l} style={{ background: 'rgba(13,21,37,.7)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '14px 16px' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c || 'var(--text)' }}>{(v || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="tabs">
          {['overview', 'chunks', 'timeline'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? 'Summary' : t === 'chunks' ? `Chunks (${chunk_analyses.length})` : `Timeline (${timeline.length})`}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            {summary.top_issues?.length > 0  && <div className="summary-section"><div className="summary-lbl">Top Issues</div><ul className="summary-list issues">{summary.top_issues.map((x,i) => <li key={i}>{x}</li>)}</ul></div>}
            {summary.actions?.length > 0     && <div className="summary-section"><div className="summary-lbl">Actions</div><ul className="summary-list actions">{summary.actions.map((x,i) => <li key={i}>{x}</li>)}</ul></div>}
            {summary.prevention?.length > 0  && <div className="summary-section"><div className="summary-lbl">Prevention</div><ul className="summary-list prevention">{summary.prevention.map((x,i) => <li key={i}>{x}</li>)}</ul></div>}
          </div>
        )}

        {tab === 'chunks' && (
          <div>
            {chunk_analyses.length === 0
              ? <p style={{ color: 'var(--text-3)', padding: '20px 0' }}>No chunk data stored.</p>
              : chunk_analyses.map(c => {
                  const sev = c.severity || 0;
                  const cls = sev <= 3 ? 'low' : sev <= 6 ? 'medium' : 'high';
                  return (
                    <div key={c.chunk_index} style={{ background: 'rgba(13,21,37,.5)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span className={`sev-badge ${cls}`}>{sev}</span>
                        <span style={{ fontWeight: 600, fontSize: '.875rem' }}>Chunk {c.chunk_index + 1}</span>
                        <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Lines {(c.line_range?.[0] ?? 0)+1}–{c.line_range?.[1] ?? '?'}</span>
                      </div>
                      <p style={{ color: 'var(--text-2)', fontSize: '.875rem' }}>{c.summary}</p>
                    </div>
                  );
                })
            }
          </div>
        )}

        {tab === 'timeline' && (
          <div className="timeline">
            {timeline.length === 0
              ? <p style={{ color: 'var(--text-3)', padding: '20px 0' }}>No timeline data stored.</p>
              : timeline.map((e, i) => (
                  <div key={i} className="tl-entry">
                    <span className="tl-ts">{e.timestamp || '—'}</span>
                    <span className={`level-badge ${e.level}`}>{e.level}</span>
                    <span className="tl-msg">{e.message}</span>
                  </div>
                ))
            }
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function History() {
  const navigate = useNavigate();
  const [query, setQuery]       = useState('');
  const [items, setItems]       = useState(() => getHistory());
  const [selected, setSelected] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const filtered = items.filter(i =>
    i.filename.toLowerCase().includes(query.toLowerCase())
  );

  const doDelete = (id, e) => {
    e.stopPropagation();
    if (toDelete === id) {
      deleteAnalysis(id);
      setItems(getHistory());
      setToDelete(null);
    } else {
      setToDelete(id);
      setTimeout(() => setToDelete(null), 3000);
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">History</h1>
        <p className="page-sub">Browse and revisit your previous log analyses</p>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Clock size={52} className="empty-ico" />
            <div className="empty-h">No history yet</div>
            <div className="empty-p">Analyses you run will appear here automatically</div>
            <button className="btn btn-primary" onClick={() => navigate('/analyze')}>
              <UploadCloud size={15} /> Analyze a Log File
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="filter-bar" style={{ marginBottom: 20 }}>
            <div className="search-wrap">
              <SearchIcon size={15} className="search-ico" />
              <input
                className="search-input"
                placeholder="Search by filename…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <span className="count-chip">{filtered.length} of {items.length}</span>
            {items.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Clear all history?')) { localStorage.removeItem('log_analyses'); setItems([]); } }}>
                <Trash2 size={13} /> Clear All
              </button>
            )}
          </div>

          <div className="hist-grid">
            {filtered.map(item => (
              <div key={item.id} className="hist-card" onClick={() => setSelected(item)}>
                <div className="hist-card-hdr">
                  <div>
                    <div className="hist-fname">{item.filename}</div>
                    <div className="hist-date">{fmt(item.analyzedAt)}</div>
                  </div>
                  <span className={`status-badge ${item.summary?.status || 'healthy'}`}>
                    {item.summary?.status || 'ok'}
                  </span>
                </div>
                <div className="hist-stats">
                  <span className="hist-stat e">{item.errors ?? 0} errors</span>
                  <span className="hist-stat w">{item.warnings ?? 0} warns</span>
                  <span className="hist-stat i">{item.info ?? 0} info</span>
                </div>
                <div className="hist-foot">
                  <button className="btn btn-secondary btn-xs" onClick={e => { e.stopPropagation(); navigate(`/analyze?id=${item.id}`); }}>
                    <Eye size={12} /> View
                  </button>
                  <button
                    className={`btn btn-xs ${toDelete === item.id ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={e => doDelete(item.id, e)}
                    title={toDelete === item.id ? 'Click again to confirm' : 'Delete'}
                  >
                    <Trash2 size={12} /> {toDelete === item.id ? 'Confirm?' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selected && <SummaryModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
