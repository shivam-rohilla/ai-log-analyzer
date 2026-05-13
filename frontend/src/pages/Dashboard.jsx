import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, AlertTriangle, ShieldAlert,
  Activity, Clock, UploadCloud, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getHistory } from '../utils/storage';

function fmt(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const history = getHistory();

  const totalFiles  = history.length;
  const totalLogs   = history.reduce((s, a) => s + (a.total_logs || 0), 0);
  const totalErrors = history.reduce((s, a) => s + (a.errors    || 0), 0);
  const criticals   = history.filter(a => a.summary?.status === 'critical').length;

  const chartData = [...history].reverse().slice(-10).map((a, i) => ({
    name: (a.filename || `#${i + 1}`).replace(/\.[^.]+$/, '').slice(0, 12),
    errors:   a.errors   || 0,
    warnings: a.warnings || 0,
  }));

  const totalWarn = history.reduce((s, a) => s + (a.warnings || 0), 0);
  const totalInfo = history.reduce((s, a) => s + (a.info     || 0), 0);
  const pieData = [
    { name: 'Errors',   value: totalErrors, color: '#ef4444' },
    { name: 'Warnings', value: totalWarn,   color: '#f59e0b' },
    { name: 'Info',     value: totalInfo,   color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const tooltipStyle = {
    contentStyle: { background: '#0a1020', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 },
    labelStyle: { color: '#94a3b8' },
  };

  return (
    <div className="page fade-in">
      {/* Welcome */}
      <div className="dash-welcome">
        <h1 className="welcome-h">
          Welcome to <span className="grad-text">LogAI</span>
        </h1>
        <p className="welcome-sub">AI-powered log analysis — upload any log file for instant insights</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-ico t"><FileText size={19} /></div>
          <div><div className="stat-val">{totalFiles}</div><div className="stat-lbl">Files Analyzed</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-ico i"><Activity size={19} /></div>
          <div><div className="stat-val">{totalLogs.toLocaleString()}</div><div className="stat-lbl">Logs Processed</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-ico e"><AlertTriangle size={19} /></div>
          <div><div className="stat-val" style={{ color: 'var(--error)' }}>{totalErrors.toLocaleString()}</div><div className="stat-lbl">Errors Found</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-ico w"><ShieldAlert size={19} /></div>
          <div><div className="stat-val" style={{ color: 'var(--warn)' }}>{criticals}</div><div className="stat-lbl">Critical Incidents</div></div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card">
          <div className="empty">
            <UploadCloud size={52} className="empty-ico" />
            <div className="empty-h">No analyses yet</div>
            <div className="empty-p">Upload your first log file to start seeing insights here</div>
            <button className="btn btn-primary" onClick={() => navigate('/analyze')}>
              <UploadCloud size={15} /> Analyze a Log File
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-grid">
            {/* Area chart */}
            <div className="card card-mb">
              <div className="card-title">
                <Activity size={16} style={{ color: 'var(--indigo-l)' }} />
                Error Trend — last {chartData.length} analyses
              </div>
              <ResponsiveContainer width="100%" height={195}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gW" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="errors"   stroke="#ef4444" fill="url(#gE)" strokeWidth={2} name="Errors"   />
                  <Area type="monotone" dataKey="warnings" stroke="#f59e0b" fill="url(#gW)" strokeWidth={2} name="Warnings" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="card card-mb">
              <div className="card-title">
                <ShieldAlert size={16} style={{ color: 'var(--indigo-l)' }} />
                All-time Log Distribution
              </div>
              <ResponsiveContainer width="100%" height={195}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent */}
          <div className="card card-mb">
            <div className="section-hdr">
              <div className="card-title" style={{ marginBottom: 0 }}>
                <Clock size={16} style={{ color: 'var(--indigo-l)' }} /> Recent Analyses
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="recent-list">
              {history.slice(0, 5).map(item => (
                <div key={item.id} className="recent-row" onClick={() => navigate(`/analyze?id=${item.id}`)}>
                  <FileText size={15} style={{ color: 'var(--indigo-l)', flexShrink: 0 }} />
                  <span className="recent-fname">{item.filename}</span>
                  <span className={`status-badge ${item.summary?.status || 'healthy'}`}>{item.summary?.status || 'ok'}</span>
                  <span style={{ fontSize: '.73rem', color: 'var(--text-3)', flexShrink: 0 }}>
                    {item.errors}E &middot; {item.warnings}W
                  </span>
                  <span className="recent-time">{fmt(item.analyzedAt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="cta-strip">
            <div className="cta-strip-txt">
              <h3>Ready to analyze more logs?</h3>
              <p>Upload a new file for instant AI-powered insights</p>
            </div>
            <button className="btn btn-white" onClick={() => navigate('/analyze')}>
              <UploadCloud size={15} /> Analyze New File
            </button>
          </div>
        </>
      )}
    </div>
  );
}
