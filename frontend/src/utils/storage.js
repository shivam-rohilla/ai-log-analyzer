const KEY = 'log_analyses';
const MAX = 20;

export function saveAnalysis(filename, result) {
  const history = getHistory();
  const entry = {
    id: Date.now().toString(),
    filename,
    analyzedAt: new Date().toISOString(),
    total_logs: result.total_logs,
    errors: result.errors,
    warnings: result.warnings,
    info: result.info,
    summary: result.summary,
    chunk_analyses: result.chunk_analyses,
    timeline: result.timeline,
  };
  const updated = [entry, ...history].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    const slim = updated.map(e => ({ ...e, chunk_analyses: [], timeline: (e.timeline || []).slice(0, 20) }));
    try { localStorage.setItem(KEY, JSON.stringify(slim)); } catch { /* storage full */ }
  }
  return entry;
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function deleteAnalysis(id) {
  localStorage.setItem(KEY, JSON.stringify(getHistory().filter(e => e.id !== id)));
}

export function getLatestAnalysis() {
  return getHistory()[0] || null;
}

export function getAnalysisById(id) {
  return getHistory().find(e => e.id === id) || null;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
