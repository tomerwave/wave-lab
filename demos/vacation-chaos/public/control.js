const meta = JSON.parse(document.getElementById('meta').textContent);
const $ = (id) => document.getElementById(id);
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const view = { mirrorKey: '', lastClick: null, twistCount: 0, snap: null, offset: 0, toastTimer: 0, ghostTimer: 0 };
const RUNTIME = { replay: 'Scripted replay', local: 'Strands on this laptop', agentcore: 'AgentCore Harness', idle: 'Not started' };

function runline(s) {
  const live = s.runMode === 'local' || s.runMode === 'agentcore';
  const status = live ? '<i class="dot"></i><b>Live</b>' : s.runMode === 'replay' ? '<i class="dot replay"></i><b>Replay</b>' : '<b>Standby</b>';
  const model = s.telemetry.model ?? (live ? 'Claude on Bedrock' : 'none');
  $('runline').innerHTML = `<span>${status}</span><span>Runtime <b>${RUNTIME[s.runMode]}</b></span><span>Model <b>${esc(model)}</b></span><span>Pace <b>${s.pace === 'turbo' ? 'Turbo' : 'Storytelling'}</b></span>`;
}

function cpClass(i, s) {
  const kind = meta.checkpoints[i].kind;
  const state = i < s.checkpoint ? 'done' : i === s.checkpoint ? 'now' : '';
  return `cp ${state} ${kind}`;
}

function rail(s) {
  const tags = { vote: 'crowd', auto: 'auto', finale: 'finale', agent: '' };
  $('rail').innerHTML = meta.checkpoints.map((c, i) => `<div class="${cpClass(i, s)}"><i></i>${esc(c.label)}<em>${tags[c.kind]}</em></div>`).join('');
}

function spent(s) {
  return (s.booked.flight?.price ?? 0) + (s.booked.hotel?.price ?? 0);
}

function missionLines(m) {
  const rows = [
    ['Who', m.partySize > 2 ? `${m.partySize} people` : m.travellers.join(' + ')],
    ['Where', m.destination ?? 'Crowd decides'],
    ['Nights', `${m.nights} (12 Dec)`],
    ['Must', m.musts.join(', ') || 'Nothing yet'],
    ['Never', m.nevers.join(', ') || 'Nothing yet'],
  ];
  if (m.persona) rows.push(['Voice', m.persona]);
  return rows.map(([k, v]) => `<div class="line"><span>${k}</span><b>${esc(v)}</b></div>`).join('');
}

function mission(s) {
  const left = s.mission.budget - spent(s);
  $('budget').textContent = money(left);
  $('budget').classList.toggle('alert', left < s.mission.budget * 0.3);
  $('budgetSub').textContent = `of ${money(s.mission.budget)}. Spent ${money(spent(s))}.`;
  $('mission').innerHTML = missionLines(s.mission);
  const booked = (label, b) => `<div class="line"><span>${label}</span>${b ? `<b>${esc(b.label)} · ${money(b.price)}</b>` : '<em>pending</em>'}</div>`;
  $('booked').innerHTML = booked('Flight', s.booked.flight) + booked('Hotel', s.booked.hotel);
  const recalled = s.events.filter((e) => e.type === 'step' && e.data.kind === 'Recalled').map((e) => e.data.text);
  if (recalled.length) $('memory').textContent = recalled.at(-1);
}

function mirror(s) {
  const key = JSON.stringify([s.route, s.site, s.applied, s.booked, s.cart, s.mission, s.events.filter((e) => e.type === 'page').length]);
  if (key === view.mirrorKey) return;
  view.mirrorKey = key;
  $('mirror').src = `${s.route}${s.route.includes('?') ? '&' : '?'}mirror=1`;
  $('url').textContent = `sunnyhop.demo${s.route.replace(/^\/site/, '') || '/'}`;
}

function ghost(s) {
  if (!s.lastClick || s.lastClick === view.lastClick) return;
  view.lastClick = s.lastClick;
  $('ghost').textContent = `Agent clicked: ${s.lastClick}`;
  $('ghost').classList.add('on');
  $('click').textContent = `Last action: ${s.lastClick}`;
  clearTimeout(view.ghostTimer);
  view.ghostTimer = setTimeout(() => $('ghost').classList.remove('on'), 2200);
}

function stepLine(e) {
  const kinds = { click: 'Did', booking: 'Booked', twist: 'Twist', ask: 'Asked', answer: 'Human', vote: 'Crowd' };
  const text = e.data.text ?? e.data.label ?? e.data.question ?? e.data.winner ?? e.data.summary ?? '';
  const kind = e.type === 'step' ? e.data.kind : kinds[e.type];
  return `<div class="st"><span>${esc(kind)}</span>${esc(text)}</div>`;
}

function thinking(s) {
  $('thought').textContent = s.thought ? `"${s.thought}"` : 'Waiting for the mission.';
  const shown = ['step', 'click', 'booking', 'twist', 'answer'];
  $('steps').innerHTML = s.events.filter((e) => shown.includes(e.type)).slice(-4).reverse().map(stepLine).join('');
  $('ask').classList.toggle('hidden', !s.pendingAsk);
  $('askText').textContent = s.pendingAsk ?? '';
  if (s.finished) $('thought').textContent = `"${s.finished}"`;
}

function voteRows(v, cls) {
  const lead = Math.max(...Object.values(v.tally));
  return v.options.map((o) => {
    const n = v.tally[o.id];
    const pct = v.total ? Math.round((n / v.total) * 100) : 0;
    return `<div class="${cls}${n === lead && n > 0 ? ' lead' : ''}"><div class="row"><span>${esc(o.label)}</span><span>${pct}%</span></div><div class="t"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
}

function votePanel(s) {
  const v = s.vote;
  $('votecard').classList.toggle('hidden', !v);
  if (v) {
    $('voteQ').textContent = v.question;
    $('voteBig').innerHTML = voteRows(v, 'vbig');
    $('vote').innerHTML = `<span class="label">Crowd vote open · ${v.total} votes</span>`;
    return;
  }
  const r = s.lastResult;
  $('vote').innerHTML = r ? `<span class="label">Last vote · ${r.total} votes</span><div class="result">${esc(r.total ? r.winner : `No votes. The universe chose: ${r.winner}`)}</div>` : '<span class="label">Crowd vote</span><div class="small muted">Opens at the next checkpoint</div>';
}

function countdown() {
  const v = view.snap?.vote;
  if (!v) return;
  const left = Math.max(0, Math.ceil((v.closesAt - (Date.now() + view.offset)) / 1000));
  $('voteCount').textContent = `0:${String(left).padStart(2, '0')}`;
}

function toast(s) {
  const twists = s.events.filter((e) => e.type === 'twist');
  if (twists.length <= view.twistCount) { view.twistCount = Math.min(view.twistCount, twists.length); return; }
  view.twistCount = twists.length;
  const t = twists.at(-1).data;
  $('toastTitle').textContent = t.label;
  $('toastText').textContent = t.blurb;
  $('toast').classList.remove('hidden');
  clearTimeout(view.toastTimer);
  view.toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 5000);
}

function tele(s) {
  const t = s.telemetry;
  const iso = s.runMode === 'agentcore' ? 'Firecracker microVM' : s.runMode === 'local' ? 'Local process' : 'None (replay)';
  const tokens = t.inputTokens + t.outputTokens;
  $('tele').innerHTML = `<span>Isolation<b>${iso}</b></span><span>Tool calls<b>${t.toolCalls}</b></span><span>Tokens<b>${tokens ? `${(tokens / 1000).toFixed(1)}k` : 'n/a'}</b></span><span>Model time<b>${t.latencyMs ? `${(t.latencyMs / 1000).toFixed(1)}s` : 'n/a'}</b></span><span>Events<b>${s.events.length}</b></span>`;
  $('stepNo').textContent = `Checkpoint ${s.checkpoint + 1} of ${meta.checkpoints.length}`;
}

function render(s) {
  view.snap = s;
  view.offset = s.serverNow - Date.now();
  [runline, rail, mission, mirror, ghost, thinking, votePanel, toast, tele].forEach((fn) => fn(s));
  countdown();
}

$('voteUrl').textContent = meta.voteUrl.replace(/^https?:\/\//, '');
new EventSource('/events').onmessage = (e) => render(JSON.parse(e.data));
setInterval(countdown, 250);
