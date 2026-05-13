import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Table2, UploadCloud, Download } from 'lucide-react';
import { getHistory } from '../utils/storage';

const PAGE_SIZE = 50;
const LEVELS = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

export default function LogExplorer() {
  const navigate = useNavigate();
  const history  = getHistory();

  const [selectedId, setSelectedId]   = useState(history[0]?.id || '');
  const [query, setQuery]             = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [page, setPage]               = useState(1);

  const analysis = history.find(h => h.id === selectedId) || null;
  const timeline = useMemo(() => analysis?.timeline || [], [analysis]);

  const filtered = useMemo(() => {
    return timeline.filter(e => {
      const matchLevel = levelFilter === 'ALL' || e.level === levelFilter;
      const matchQuery = !query || e.message?.toLowerCase().includes(query.toLowerCase()) || e.timestamp?.includes(query);
      return matchLevel && matchQuery;
    });
  }, [timeline, levelFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const exportTxt = () => {
    const text = filtered.map(e => `[${e.level}] ${e.timestamp || ''} ${e.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${analysis?.filename || 'logs'}_export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageButtons = () => {
    const btns = [];
    const delta = 2;
    let lo = Math.max(1, safePage - delta);
    let hi = Math.min(totalPages, safePage + delta);
    if (lo > 1) { btns.push(1); if (lo > 2) btns.push('…'); }
    for (let i = lo; i <= hi; i++) btns.push(i);
    if (hi < totalPages) { if (hi < totalPages - 1) btns.push('…'); btns.push(totalPages); }
    return btns;
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Log Explorer</h1>
        <p className="page-sub">Search, filter, and browse log entries from any analysis</p>
      </div>

      {history.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Table2 size={52} className="empty-ico" />
            <div className="empty-h">No analyses available</div>
            <div className="empty-p">Run an analysis first to explore log entries here</div>
            <button className="btn btn-primary" onClick={() => navigate('/analyze')}>
              <UploadCloud size={15} /> Analyze a Log File
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* File selector */}
          <div className="card card-mb">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ fontSize: '.8rem', color: 'var(--text-2)', fontWeight: 600, flexShrink: 0 }}>
                Analysis:
              </label>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); resetPage(); setQuery(''); setLevelFilter('ALL'); }}
                style={{
                  flex: 1, minWidth: 200, background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', padding: '7px 12px', color: 'var(--text)',
                  fontSize: '.875rem', outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {history.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.filename} — {new Date(h.analyzedAt).toLocaleDateString()} ({h.total_logs} logs)
                  </option>
                ))}
              </select>
              {analysis && (
                <span className={`status-badge ${analysis.summary?.status || 'healthy'}`}>
                  {analysis.summary?.status || 'ok'}
                </span>
              )}
              {filtered.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={exportTxt}>
                  <Download size={13} /> Export
                </button>
              )}
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <div className="search-wrap">
              <Search size={14} className="search-ico" />
              <input
                className="search-input"
                placeholder="Search message or timestamp…"
                value={query}
                onChange={e => { setQuery(e.target.value); resetPage(); }}
              />
            </div>
            {LEVELS.map(l => (
              <button
                key={l}
                className={`filter-btn ${levelFilter === l ? `f-${l}` : ''}`}
                onClick={() => { setLevelFilter(l); resetPage(); }}
              >
                {l}
              </button>
            ))}
            {(query || levelFilter !== 'ALL') && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setQuery(''); setLevelFilter('ALL'); resetPage(); }}>
                Reset
              </button>
            )}
          </div>

          {/* Table */}
          <div className="card">
            <div className="section-hdr" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>
                Showing <strong style={{ color: 'var(--text)' }}>{filtered.length.toLocaleString()}</strong> of{' '}
                <strong style={{ color: 'var(--text)' }}>{timeline.length.toLocaleString()}</strong> entries
              </div>
              <span className="count-chip">Page {safePage}/{totalPages}</span>
            </div>

            {pageItems.length === 0 ? (
              <div className="empty" style={{ padding: '32px' }}>
                <div className="empty-h">No matching entries</div>
                <div className="empty-p">Try adjusting your search or filter</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="log-table">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th style={{ width: 160 }}>Timestamp</th>
                      <th style={{ width: 72 }}>Level</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((entry, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-3)', fontSize: '.72rem' }}>{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="ts-col">{entry.timestamp || '—'}</td>
                        <td><span className={`level-badge ${entry.level}`}>{entry.level}</span></td>
                        <td className="msg-col">{entry.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <span className="pg-info">
                  {((safePage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(safePage * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
                </span>
                <div className="pg-btns">
                  <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                    <ChevronLeft size={14} />
                  </button>
                  {pageButtons().map((b, i) =>
                    b === '…'
                      ? <span key={i} style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--text-3)', fontSize: '.8rem' }}>…</span>
                      : <button key={b} className={`pg-btn ${safePage === b ? 'active' : ''}`} onClick={() => setPage(b)}>{b}</button>
                  )}
                  <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
