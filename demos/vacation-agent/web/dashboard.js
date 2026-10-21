import dcv from '/dcv/dcv.js';
import { StageLiveView } from '/live-view.js';
const $ = id => document.getElementById(id);
let snapshot, gateId, streamRun, replayData;
let pollBusy = false, commandBusy = false;
async function api(path, body) {
  const response = await fetch(`/api/${path}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: snapshot?.run?.state.id, ...body }) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || 'הפעולה נכשלה'); return value;
}
async function command(path, body = {}) {
  if (commandBusy && !['stop', 'reset', 'ready'].includes(path)) return;
  commandBusy = true;
  try { await api(path, body); $('error').textContent = ''; await poll(); }
  catch (error) { $('error').textContent = error.message; $('notice').textContent = error.message; }
  finally { commandBusy = false; }
}
function resize() {
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  Object.assign($('display').style, { transform: `scale(${scale})`, left: `${(innerWidth - 1920 * scale) / 2}px`, top: `${(innerHeight - 1080 * scale) / 2}px` });
}
addEventListener('resize', resize); resize();
function activeRunId() { return ['stopped', 'error'].includes(snapshot?.run?.status) ? undefined : snapshot?.run?.state.id; }
const view = new StageLiveView(dcv, {
  runId: activeRunId, url: () => api('live-view'), clear: () => $('display').replaceChildren(), resize,
  failed: runId => { $('notice').textContent = 'חיבור ה־Live View נכשל. הסוכן הושהה; בדוק רשת והרשאות לפני המשך.'; void command('pause', { runId }); },
  ready: runId => { $('empty').hidden = true; void command('ready', { runId }); },
});
function button(label, action) { const b = document.createElement('button'); b.textContent = label; b.onclick = action; return b; }
function budgetInput(gate, run) {
  const input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = '1000000'; input.step = '1'; input.value = String(run.state.requirements.budgetNis); input.setAttribute('aria-label', 'תקציב מאושר לכל הנוסעים בשקלים');
  $('gate-body').append(input, button('אשר תקציב כולל ושלח לסוכן', () => command('answer', { id: gate.id, answer: { budgetNis: Number(input.value) } })));
}
function clarificationInput(gate) {
  const input = document.createElement('textarea'); input.maxLength = 2000; input.setAttribute('aria-label', 'הבהרה לסוכן');
  $('gate-body').append(input, button('שלח הבהרה בלי לבטל דרישות קשיחות', () => command('answer', { id: gate.id, answer: { text: input.value } })));
}
function cancellationChoices(gate) {
  const choices = [['waive-both', 'מוותר במפורש על ביטול לטיסה ולמלון — לסיכום בלבד'], ['retain', 'שמור על ביטול לשניהם וחפש חלופה'], ['compare', 'השווה חלופות עם ביטול']];
  choices.forEach(([choice, label]) => $('gate-body').append(button(label, () => command('answer', { id: gate.id, answer: { choice } }))));
}
function questionBody(gate, run) {
  const renderers = {
    budget: () => budgetInput(gate, run), cancellation: () => cancellationChoices(gate), constraints: () => clarificationInput(gate),
    destination: () => $('gate-body').append(button('בחן את יעדי איראן בסיפור הבדיוני; שמור את כל התנאים', () => command('answer', { id: gate.id, answer: { choice: 'explore-fictional' } }))),
  };
  renderers[gate.kind]();
}
function gateContent(run, gate) {
  $('gate-label').textContent = run.checkpoint ? `הקהל משנה את העולם / ${gate.number}` : snapshot.mode === 'local' ? 'הבהרה נדרשת בתרגול ידני / ללא AI' : 'הסוכן שואל את הנוסע / HUMAN GATE';
  $('gate-title').textContent = gate.text || (gate.number === 1 ? 'מי מצטרף לחופשה?' : 'עוד שינוי בתוכניות.');
  $('gate-body').replaceChildren();
  if (run.checkpoint) gate.choices.forEach(c => $('gate-body').append(button(c.label, () => command('vote', { id: gate.id, choice: c.id }))));
  else questionBody(gate, run);
}
function showGate(run) {
  const gate = run?.checkpoint || run?.question;
  if (!gate) { if ($('gate').open) $('gate').close(); gateId = undefined; return; }
  if (gateId === gate.id) return;
  gateId = gate.id; gateContent(run, gate);
  if (!$('gate').open) $('gate').showModal();
}
const statuses = { starting: 'פותח את סשן AgentCore', running: 'הסוכן פועל', paused: 'הסוכן מושהה בגבול פעולה', checkpoint: 'הפעולה הסתיימה. ממתין לבחירת הקהל', question: 'הסוכן ממתין לתשובת הנוסע', review: 'סיכום לבדיקה בלבד. לא בוצעה הזמנה', stopped: 'הריצה נעצרה', error: 'הריצה נעצרה בגלל שגיאה' };
const localStatuses = { running: 'תרגול ידני — בחרו הצעה באתר', paused: 'התרגול מושהה', checkpoint: 'הצבעת קהל', question: 'הבהרה נדרשת בתרגול ידני — ללא AI', review: 'סיכום לבדיקה בלבד', stopped: 'התרגול נעצר' };
function statusText(run) { const labels = snapshot.mode === 'local' ? localStatuses : statuses; return `${labels[run.status] || run.status}${run.state.world.iran ? ' · עולם בדיוני: כל היעדים באיראן' : ''}`; }
function modeLabel(run) { return run && snapshot.mode === 'live' ? 'LIVE · Jev + AWS AgentCore · שירותים בתשלום; בחירות מודל חיות' : 'LOCAL · תרגול ידני באתר מקומי. ללא AI, ללא AWS וללא חיוב.'; }
function renderHeader(run) {
  $('mode').textContent = modeLabel(run);
  $('start').disabled = !!run; $('start-live').hidden = !snapshot.liveEnabled; $('start-live').disabled = !!run;
  $('badge').textContent = run ? `${snapshot.mode === 'local' ? 'LOCAL / MANUAL / NO AI' : 'LIVE'} / ${run.decisions}` : 'LOCAL / NO AI';
  $('notice').textContent = run ? statusText(run) : 'אין סשן פעיל';
  if (run?.error) $('error').textContent = run.error;
}
function renderControls(run) {
  $('ask-budget').hidden = snapshot.mode !== 'local' || !run; $('ask-budget').disabled = run?.status !== 'running';
  $('reconnect').hidden = snapshot.mode === 'local' || !run;
  $('pause').disabled = !run || run.status !== 'running';
  $('resume').disabled = !run || run.status !== 'paused' || !snapshot.viewerReady;
  if (!replayData) $('trace').textContent = JSON.stringify(run || { message: 'No run yet' }, null, 2);
}
function renderStream(run) {
  $('local-site').hidden = snapshot.mode !== 'local' || !activeRunId();
  if (snapshot.mode === 'local' && activeRunId()) { renderLocal(); return; }
  if (!activeRunId()) { view.disconnect(); $('empty').hidden = false; streamRun = undefined; return; }
  if (snapshot.streamAvailable && streamRun !== run.state.id) { streamRun = run.state.id; void view.connect(run.state.id); }
}
async function poll() {
  if (pollBusy) return; pollBusy = true;
  try { snapshot = await api('state'); const run = snapshot.run; renderHeader(run); renderStream(run); renderControls(run); showGate(run); }
  catch { $('notice').textContent = 'השרת המקומי אינו זמין'; }
  finally { pollBusy = false; }
}
function renderLocal() {
  view.disconnect(); $('empty').hidden = true;
  if (!$('local-site').getAttribute('src')) $('local-site').src = '/local-site';
}
addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== $('local-site').contentWindow) return;
  if (event.data?.type === 'manual-site-action') void command('local-action', event.data);
});
$('ask-budget').onclick = () => command('local-action', { action: 'ask:budget', revision: snapshot?.run?.state.revision });
$('reconnect').onclick = () => { const id = activeRunId(); if (id) void view.connect(id); };
$('start').onclick = () => command('start-local'); $('start-live').onclick = () => command('start'); $('stop').onclick = () => command('stop'); $('gate-stop').onclick = () => command('stop');
$('pause').onclick = () => command('pause'); $('resume').onclick = () => command('resume'); $('reset').onclick = async () => { await command('reset'); replayData = undefined; };
$('fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
$('open-logs').onclick = () => $('logs').showModal(); $('close-logs').onclick = () => { $('logs').close(); replayData = undefined; };
$('replay').onclick = async () => { replayData = await api('replay'); $('trace').textContent = JSON.stringify(replayData, null, 2); $('replay-label').textContent = 'REPLAY / תמליל מוקלט בלבד. אינו ריצת AI חדשה ואינו Live View.'; };
$('download').onclick = async () => { const data = replayData || await api('replay'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'vacation-stage-replay.json'; a.click(); URL.revokeObjectURL(url); };
$('gate').addEventListener('cancel', e => e.preventDefault());
addEventListener('keydown', event => { if (event.key === 'Escape' && !$('logs').open && !$('gate').open) void command('pause'); });
setInterval(poll, 600); void poll();
