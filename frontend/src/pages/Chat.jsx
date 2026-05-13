import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Send, RefreshCw, MessageSquare, UploadCloud, Copy, Check, Trash2, Bot, User } from 'lucide-react';
import { getHistory } from '../utils/storage';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const SUGGESTIONS = [
  'What is the root cause of the errors?',
  'Which errors are most critical?',
  'What should I fix first?',
  'Are there any security concerns?',
  'Summarize the incidents in this log',
  'What do the warnings indicate?',
  'Are there any performance issues?',
  'What caused the spike in errors?',
];

function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const navigate = useNavigate();
  const history  = getHistory();

  const [selectedId, setSelectedId] = useState(history[0]?.id || '');
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [copied, setCopied]         = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const analysis = history.find(h => h.id === selectedId) || null;
  const logContext = analysis
    ? (analysis.timeline || []).map(e => `[${e.level}] ${e.timestamp} ${e.message}`).join('\n')
    : '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (question) => {
    const q = (question || input).trim();
    if (!q || loading || !analysis) return;
    setInput('');

    const userMsg = { role: 'user', text: q, ts: new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/chat-about-logs`, null, {
        params: { question: q, log_context: logContext },
        timeout: 60000,
      });
      setMessages(m => [...m, { role: 'ai', text: data.answer, ts: new Date().toISOString() }]);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to get response';
      setMessages(m => [...m, { role: 'ai', text: `Error: ${msg}`, ts: new Date().toISOString(), isError: true }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, analysis, logContext]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  if (history.length === 0) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h1 className="page-title">AI Chat</h1><p className="page-sub">Ask anything about your logs</p></div>
        <div className="card">
          <div className="empty">
            <MessageSquare size={52} className="empty-ico" />
            <div className="empty-h">No analyses to chat about</div>
            <div className="empty-p">Run an analysis first, then come back to ask questions about your logs</div>
            <button className="btn btn-primary" onClick={() => navigate('/analyze')}>
              <UploadCloud size={15} /> Analyze a Log File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ paddingBottom: 0 }}>
      <div className="page-header">
        <h1 className="page-title">AI Chat</h1>
        <p className="page-sub">Ask questions about your log analysis</p>
      </div>

      <div className="chat-layout">
        {/* Left panel */}
        <div className="chat-left">
          {/* Context selector */}
          <div className="ctx-card">
            <div className="ctx-title">Active Analysis</div>
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setMessages([]); }}
              style={{
                width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', padding: '6px 10px', color: 'var(--text)',
                fontSize: '.8rem', outline: 'none', marginBottom: 10, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {history.map(h => (
                <option key={h.id} value={h.id}>
                  {h.filename.length > 22 ? h.filename.slice(0, 22) + '…' : h.filename}
                </option>
              ))}
            </select>
            {analysis && (
              <>
                <div className="ctx-row"><span className="ctx-key">Analyzed</span><span className="ctx-val" style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{fmt(analysis.analyzedAt)}</span></div>
                <div className="ctx-row"><span className="ctx-key">Total logs</span><span className="ctx-val">{analysis.total_logs?.toLocaleString()}</span></div>
                <div className="ctx-row"><span className="ctx-key">Errors</span><span className="ctx-val" style={{ color: 'var(--error)' }}>{analysis.errors}</span></div>
                <div className="ctx-row"><span className="ctx-key">Warnings</span><span className="ctx-val" style={{ color: 'var(--warn)' }}>{analysis.warnings}</span></div>
                <div className="ctx-row"><span className="ctx-key">Status</span><span className={`status-badge ${analysis.summary?.status || 'healthy'}`} style={{ fontSize: '.65rem', padding: '2px 7px' }}>{analysis.summary?.status || 'ok'}</span></div>
              </>
            )}
          </div>

          {/* Suggestions */}
          <div className="ctx-card" style={{ flex: 1, overflow: 'hidden' }}>
            <div className="ctx-title">Suggested Questions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="suggest-btn"
                  onClick={() => send(q)}
                  disabled={loading || !analysis}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {messages.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setMessages([])} style={{ width: '100%' }}>
              <Trash2 size={13} /> Clear chat
            </button>
          )}
        </div>

        {/* Right panel */}
        <div className="chat-right">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="empty" style={{ flex: 1 }}>
                <Bot size={48} className="empty-ico" />
                <div className="empty-h">Start a conversation</div>
                <div className="empty-p">Ask anything about the logs — root causes, fixes, patterns, or anything else</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`} style={msg.isError ? { borderColor: 'rgba(239,68,68,.3)' } : {}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {msg.role === 'user'
                    ? <User size={13} style={{ color: 'var(--indigo-l)' }} />
                    : <Bot  size={13} style={{ color: 'var(--ok)' }} />
                  }
                  <span style={{ fontSize: '.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <span style={{ fontSize: '.68rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
                    {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'ai' && (
                    <button
                      onClick={() => copyText(msg.text, i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                      title="Copy"
                    >
                      {copied === i ? <Check size={12} style={{ color: 'var(--ok)' }} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{msg.text}</div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble ai">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Bot size={13} style={{ color: 'var(--ok)' }} />
                  <span style={{ fontSize: '.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>AI</span>
                </div>
                <div className="dot-row">
                  <div className="dot" /><div className="dot" /><div className="dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={analysis ? 'Ask about your logs…' : 'Select an analysis above first'}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={handleKey}
              disabled={loading || !analysis}
              rows={1}
            />
            <button
              className="btn btn-primary"
              onClick={() => send()}
              disabled={loading || !input.trim() || !analysis}
              style={{ flexShrink: 0, height: 44 }}
            >
              {loading
                ? <RefreshCw size={15} style={{ animation: 'spin .7s linear infinite' }} />
                : <Send size={15} />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
