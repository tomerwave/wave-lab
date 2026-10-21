let current, signature;
window.__stageAction = action => {
  if (!current) return;
  parent.postMessage({ type: 'manual-site-action', action, revision: current.revision, runId: current.runId }, location.origin);
};
async function refresh() {
  try {
    const response = await fetch('/api/local-page'); const data = await response.json();
    if (!data) return;
    current = data; const next = JSON.stringify(data);
    if (signature !== next) { signature = next; window.__stageSync(data); }
  } catch { document.title = 'Local server unavailable'; }
}
setInterval(refresh, 250); void refresh();
