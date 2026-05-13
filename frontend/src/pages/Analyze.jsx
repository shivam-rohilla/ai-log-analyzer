import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  UploadCloud, FileText, AlertTriangle, Info, CheckCircle,
  ChevronDown, Activity, ShieldAlert, Zap, Table2,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { saveAnalysis, getAnalysisById } from '../utils/storage';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function sevClass(n) {
  if (n <= 3) return 'low';
  if (n <= 6) return 'medium';
  return 'high';
}

function buildChart(timeline) {
  const buckets = {};
  (timeline || []).forEach(({ timestamp, level }) => {
    const key = timestamp ? timestamp.slice(0, 16) : 'unknown';
    if (!buckets[key]) buckets[key] = { time: key, ERROR: 0, WARN: 0, INFO: 0 };
    const l = level === 'WARN' ? 'WARN' : level === 'ERROR' ? 'ERROR' : 'INFO';
    buckets[key][l]++;
  });
  return Object.values(buckets).slice(0, 30);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatsRow({ total, errors, warnings, info }) {
  return (
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-ico t"><FileText size={19} /></div><div><div className="stat-val">{total.toLocaleString()}</div><div className="stat-lbl">Total Logs</div></div></div>
      <div className="stat-card"><div className="stat-ico e"><AlertTriangle size={19} /></div><div><div className="stat-val" style={{ color: 'var(--error)' }}>{errors.toLocaleString()}</div><div className="stat-lbl">Errors</div></div></div>
      <div className="stat-card"><div className="stat-ico w"><ShieldAlert size={19} /></div><div><div className="stat-val" style={{ color: 'var(--warn)' }}>{warnings.toLocaleString()}</div><div className="stat-lbl">Warnings</div></div></div>
      <div className="stat-card"><div className="stat-ico i"><Info size={19} /></div><div><div className="stat-val" style={{ color: 'var(--info)' }}>{info.toLocaleString()}</div><div className="stat-lbl">Info</div></div></div>
    </div>
  );
}

function SummaryCard({ summary }) {
  const { status = 'healthy', top_issues = [], actions = [], prevention = [] } = summary || {};
  return (
    <div className="card card-mb">
      <div className="card-title">
        <Zap size={17} style={{ color: 'var(--indigo-l)' }} />
        AI System Summary
        <span className={`status-badge ${status}`}>
          {status === 'healthy'  && <CheckCircle size={11} />}
          {status === 'degraded' && <AlertTriangle size={11} />}
          {status === 'critical' && <ShieldAlert size={11} />}
          {status}
        </span>
      </div>
      {top_issues.length > 0 && <div className="summary-section"><div className="summary-lbl">Top Issues</div><ul className="summary-list issues">{top_issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {actions.length > 0     && <div className="summary-section"><div className="summary-lbl">Recommended Actions</div><ul className="summary-list actions">{actions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {prevention.length > 0  && <div className="summary-section"><div className="summary-lbl">Prevention Tips</div><ul className="summary-list prevention">{prevention.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
    </div>
  );
}

function ChunkItem({ chunk }) {
  const [open, setOpen] = useState(false);
  const cls = sevClass(chunk.severity || 0);
  return (
    <div className="chunk-item">
      <button className="chunk-hdr" onClick={() => setOpen(o => !o)}>
        <span className={`sev-badge ${cls}`}>{chunk.severity || 0}</span>
        <span className="chunk-title">Chunk {chunk.chunk_index + 1}</span>
        <span className="chunk-range">Lines {(chunk.line_range?.[0] ?? 0) + 1}–{chunk.line_range?.[1] ?? '?'}</span>
        <ChevronDown size={15} className={`chunk-chev ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="chunk-body">
          <p className="chunk-summary">{chunk.summary}</p>
          {chunk.issues?.length > 0 && <div className="chunk-sec"><div className="chunk-sec-lbl">Issues</div><div className="tag-list">{chunk.issues.map((x, i) => <span key={i} className="tag issue">{x}</span>)}</div></div>}
          {chunk.root_cause && <div className="chunk-sec"><div className="chunk-sec-lbl">Root Cause</div><div className="root-box">{chunk.root_cause}</div></div>}
          {chunk.fixes?.length > 0 && <div className="chunk-sec"><div className="chunk-sec-lbl">Fixes</div><div className="tag-list">{chunk.fixes.map((x, i) => <span key={i} className="tag fix">{x}</span>)}</div></div>}
        </div>
      )}
    </div>
  );
}

function Timeline({ entries }) {
  if (!entries?.length) return <p style={{ color: 'var(--text-3)', padding: '16px 0' }}>No entries.</p>;
  return (
    <div className="timeline">
      {entries.map((e, i) => (
        <div key={i} className="tl-entry">
          <span className="tl-ts">{e.timestamp || '—'}</span>
          <span className={`level-badge ${e.level}`}>{e.level}</span>
          <span className="tl-msg">{e.message}</span>
        </div>
      ))}
    </div>
  );
}

function Chart({ timeline }) {
  const data = buildChart(timeline);
  if (!data.length) return null;
  const ts = { contentStyle: { background: '#0a1020', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }, labelStyle: { color: '#94a3b8' } };
  return (
    <div className="card card-mb">
      <div className="card-title"><Activity size={16} style={{ color: 'var(--indigo-l)' }} /> Log Activity Timeline</div>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip {...ts} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Line type="monotone" dataKey="ERROR" stroke="#ef4444" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="WARN"  stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="INFO"  stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Analyze() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const historyId = searchParams.get('id');

  const [dragOver, setDragOver]   = useState(false);
  const [file, setFile]           = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [tab, setTab]             = useState('overview');
  const [savedId, setSavedId]     = useState(null);
  const fileRef = useRef(null);

  // Load from history if ?id= param present
  useEffect(() => {
    if (historyId) {
      const entry = getAnalysisById(historyId);
      if (entry) {
        setResult(entry);
        setFile({ name: entry.filename });
        setSavedId(entry.id);
      }
    }
  }, [historyId]);

  const analyze = useCallback(async (f) => {
    if (!f) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setSavedId(null);
    setTab('overview');

    const form = new FormData();
    form.append('file', f);
    try {
      const { data } = await axios.post(`${API}/analyze-logs`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResult(data);
      const entry = saveAnalysis(f.name, data);
      setSavedId(entry.id);
    } catch (err) {
      if (err.code === 'ECONNABORTED') setError('Request timed out. Try a smaller log file.');
      else setError(err.response?.data?.detail || err.message || 'Analysis failed. Is the backend running?');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const onFile = (f) => { if (!f) return; setFile(f); analyze(f); };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Analyze Logs</h1>
        <p className="page-sub">Upload a log file for AI-powered analysis</p>
      </div>

      {!historyId && (
        <div className="card card-mb">
          <button
            className={`upload-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => !analyzing && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]); }}
            disabled={analyzing}
          >
            <div className="upload-z-icon"><UploadCloud size={40} style={{ opacity: 0.65 }} /></div>
            {file ? (
              <><p className="upload-z-text">Selected:</p><p className="upload-z-file">{file.name}</p></>
            ) : (
              <><p className="upload-z-text">Drag & drop or click to upload</p><p className="upload-z-hint">Supports .log and .txt files</p></>
            )}
          </button>
          <input ref={fileRef} type="file" accept=".log,.txt" style={{ display: 'none' }}
            onChange={e => onFile(e.target.files[0])} />
        </div>
      )}

      {historyId && file && (
        <div className="card card-mb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} style={{ color: 'var(--indigo-l)' }} />
            <div>
              <div style={{ fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>Loaded from history</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analyze')}>
            <UploadCloud size={14} /> Analyze New File
          </button>
        </div>
      )}

      {error && (
        <div className="alert err"><AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}</div>
      )}

      {analyzing && (
        <div className="card card-mb">
          <div className="loader-box">
            <div className="spinner" />
            <p className="loader-txt">Analyzing logs with AI… this may take 15–30 seconds</p>
          </div>
        </div>
      )}

      {result && !analyzing && (
        <div className="fade-in">
          <StatsRow total={result.total_logs} errors={result.errors} warnings={result.warnings} info={result.info} />

          <Chart timeline={result.timeline} />

          <SummaryCard summary={result.summary} />

          {/* Tabs */}
          <div className="card">
            <div className="tabs">
              {['overview', 'chunks', 'timeline'].map(t => (
                <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'overview' ? 'Overview' : t === 'chunks' ? `Chunks (${result.chunk_analyses?.length || 0})` : `Timeline (${result.timeline?.length || 0})`}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
                  {[
                    { label: 'Total Logs',  val: result.total_logs,  col: '' },
                    { label: 'Errors',      val: result.errors,      col: 'var(--error)' },
                    { label: 'Warnings',    val: result.warnings,    col: 'var(--warn)' },
                    { label: 'Info',        val: result.info,        col: 'var(--info)' },
                    { label: 'Chunks',      val: result.chunk_analyses?.length || 0, col: '' },
                    { label: 'Status',      val: result.summary?.status || '—', col: '' },
                  ].map(({ label, val, col }) => (
                    <div key={label} style={{ background: 'rgba(13,21,37,.6)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '14px 16px' }}>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: col || 'var(--text)', letterSpacing: '-.02em' }}>{val}</div>
                    </div>
                  ))}
                </div>
                {savedId && (
                  <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/explorer')}>
                      <Table2 size={13} /> Explore in Log Explorer
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/chat')}>
                      Chat about this analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'chunks' && (
              <div>
                {result.chunk_analyses?.map(c => <ChunkItem key={c.chunk_index} chunk={c} />)}
              </div>
            )}

            {tab === 'timeline' && <Timeline entries={result.timeline} />}
          </div>
        </div>
      )}
    </div>
  );
}
