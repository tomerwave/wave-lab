const meta = JSON.parse(document.getElementById('meta').textContent);
const $ = (id) => document.getElementById(id);
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const presenter = window.presenter ?? { on: false, button: () => '' };
const BUDGETS = [1200, 2400, 5000];
const MOMENT_MS = 5000;
const STALE_MS = 15000;
const view = { mirrorKey: '', lastClick: null, ghostTimer: 0, snap: null, offset: 0, seenAt: null, seenSame: 0, moments: [], moment: null, momentUntil: 0, stageKey: '' };

const spent = (s) => (s.booked.flight?.price ?? 0) + (s.booked.hotel?.price ?? 0);
const qr = (cls) => `<img src="/qr.svg" alt="QR code to vote" class="${cls}">`;
const voteHost = meta.voteUrl.replace(/^https?:\/\//, '');

function status(s) {
  const live = s.runMode !== 'idle' && !s.finished && !s.stopped;
  const where = s.mission.destination ? `Tomer to ${esc(s.mission.destination)}` : 'Where is Tomer going?';
  $('status').innerHTML = live ? `<span class="badge"><i class="dot"></i><b>Live</b></span><span class="badge">${where}</span>` : '';
}

function fitMirror() {
  const box = $('screen').getBoundingClientRect();
  const scale = box.width / 1280;
  Object.assign($('mirror').style, { transform: `scale(${scale})`, height: `${box.height / scale}px` });
}

function missionLines(m) {
  const rows = [
    ['Who', m.partySize > 2 ? `${m.partySize} people` : m.travellers.join(' + ')],
    ['Where', m.destination ?? 'The crowd decides'],
    ['Nights', `${m.nights}, from 12 Dec`],
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
  $('meter').style.width = `${Math.max(0, Math.min(100, (left / s.mission.budget) * 100))}%`;
  $('budgetSub').textContent = `of ${money(s.mission.budget)}. Spent ${money(spent(s))}.`;
  $('mission').innerHTML = missionLines(s.mission);
  const booked = (label, b) => `<div class="line"><span>${label}</span>${b ? `<b>${esc(b.label)} · ${money(b.price)}</b>` : '<em>Not yet</em>'}</div>`;
  $('booked').innerHTML = booked('Flight', s.booked.flight) + booked('Hotel', s.booked.hotel);
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
  $('thought').textContent = s.finished ?? s.thought ?? 'Waiting for the mission.';
  const shown = ['step', 'click', 'booking', 'twist', 'answer'];
  $('steps').innerHTML = s.events.filter((e) => shown.includes(e.type)).slice(-6).reverse().map(stepLine).join('');
  const r = s.lastResult;
  $('lastVote').innerHTML = `<span class="label">Last crowd vote</span><div class="result">${r ? esc(r.winner) : '<em>None yet</em>'}</div>`;
}

function tele(s) {
  const t = s.telemetry;
  const tokens = t.inputTokens + t.outputTokens;
  $('tele').innerHTML = `<span>Tool calls<b>${t.toolCalls}</b></span><span>Tokens<b>${tokens ? `${(tokens / 1000).toFixed(1)}k` : 'n/a'}</b></span><span>Model time<b>${t.latencyMs ? `${(t.latencyMs / 1000).toFixed(1)}s` : 'n/a'}</b></span><span>Events<b>${s.events.length}</b></span>`;
}

function freshEvents(s) {
  const events = s.events;
  const sameAs = (at) => events.filter((e) => e.at === at).length;
  if (view.seenAt === null) {
    view.seenAt = events.at(-1)?.at ?? 0;
    view.seenSame = sameAs(view.seenAt);
    return [];
  }
  let same = 0;
  const fresh = events.filter((e) => {
    if (e.at < view.seenAt) return false;
    if (e.at === view.seenAt) return ++same > view.seenSame;
    return true;
  });
  if (fresh.length) {
    view.seenAt = fresh.at(-1).at;
    view.seenSame = sameAs(view.seenAt);
  }
  return fresh;
}

function voteMoment(d, s) {
  const nobody = d.total === 0;
  const kicker = { destination: 'The crowd chose', rule: 'His one rule', chaos: 'Plot twist, chosen by the crowd' }[d.target];
  const m = s.mission;
  const text = d.target === 'destination' ? `Tomer is going to ${d.winner}.`
    : d.target === 'rule' ? `Mission locked: ${m.destination}, ${money(m.budget)}, ${m.nights} nights. Agent, go.` : '';
  const foot = d.target === 'destination' ? 'Next: his one rule' : 'Back to the agent';
  return { kicker: nobody ? 'Nobody voted, so the universe chose' : kicker, title: d.winner, text, foot };
}

function momentFor(e, s) {
  if (e.type === 'vote' && e.data.phase === 'closed') return voteMoment(e.data, s);
  if (e.type === 'booking' && e.data.item !== 'trip') return { kicker: `The agent booked the ${e.data.item}`, title: e.data.label, text: money(e.data.price), ms: 3500 };
  return null;
}

function twistMoment({ data: d, at }) {
  const last = view.moments.at(-1) ?? view.moment;
  if (last?.title === d.label) last.text = d.blurb;
  else view.moments.push({ kicker: 'Plot twist', title: d.label, text: d.blurb, at });
}

function absorb(e, s) {
  if (e.type === 'reset') return Object.assign(view, { moments: [], moment: null });
  if (e.type === 'twist') return twistMoment(e);
  const moment = momentFor(e, s);
  if (moment) view.moments.push({ ...moment, at: e.at });
}

function collectMoments(s) {
  freshEvents(s).forEach((e) => absorb(e, s));
}

function currentMoment() {
  const now = Date.now();
  if (view.moment && now < view.momentUntil) return view.moment;
  view.moments = view.moments.filter((m) => now + view.offset - m.at < STALE_MS);
  view.moment = view.moments.shift() ?? null;
  if (view.moment) view.momentUntil = now + (view.moment.ms ?? MOMENT_MS);
  return view.moment;
}

function lobby(s) {
  const m = s.mission;
  const chips = presenter.on ? `<div class="chips"><span>Budget</span>${BUDGETS.map((b) => presenter.button(money(b), 'budget', { budget: b }, b === m.budget ? 'chip on' : 'chip')).join('')}</div>` : '';
  const go = presenter.on ? presenter.button('Start', 'start', {}, 'go') : '';
  return `<div class="scene lobby"><span class="kicker">Live demo</span><h2>Let's book Tomer a vacation</h2>
<p class="lead">An AI agent books it live, in a real browser. You decide where he goes, and what goes wrong on the way.</p>
<div class="facts"><div><span>Budget</span><b>${money(m.budget)}</b></div><div><span>Trip</span><b>${m.nights} nights</b></div><div><span>From</span><b>Tel Aviv</b></div><div><span>Leaving</span><b>12 December</b></div></div>
<div class="join">${qr('qr big')}<div><b>Scan now to join</b><span class="url">${esc(voteHost)}</span><span class="muted">Votes pop up on your phone when it is your turn.</span><span class="count">${s.audience} ${s.audience === 1 ? 'phone' : 'phones'} in</span></div></div>
${chips}${go}</div>`;
}

function voteRows(v) {
  const lead = Math.max(...Object.values(v.tally));
  return v.options.map((o) => {
    const n = v.tally[o.id];
    const pct = v.total ? Math.round((n / v.total) * 100) : 0;
    const blurb = o.blurb ? `<small>${esc(o.blurb)}</small>` : '';
    return `<div class="opt${n === lead && n > 0 ? ' lead' : ''}"><div class="row"><span><b>${esc(o.label)}</b>${blurb}</span><span>${pct}%</span></div><div class="t"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
}

function voteScene(v) {
  const end = presenter.on ? presenter.button('End vote now', 'close-vote', {}, 'quiet') : '';
  return `<div class="scene vote"><span class="kicker live">Crowd vote · ${v.total} ${v.total === 1 ? 'vote' : 'votes'}</span><h2>${esc(v.question)}</h2>
<div class="opts">${voteRows(v)}</div>
<div class="vfoot">${qr('qr')}<div><b>Vote on your phone</b><span class="url">${esc(voteHost)}</span></div><div class="count" id="voteCount"></div></div>${end}</div>`;
}

function goatGrid() {
  const goat = (i) => meta.goatCells.includes(i);
  return `<div class="goats">${Array.from({ length: 9 }, (_, i) => `<span class="cell${goat(i) ? ' goat' : ''}" data-goat="${i}">${goat(i) ? meta.goat : ''}</span>`).join('')}</div>`;
}

function askControls(ask) {
  if (!presenter.on) return '<p class="muted">Waiting for Tomer to answer.</p>';
  if (ask.kind === 'human-check') return `<p class="hint">Robots are not allowed. Tap every goat.</p>${goatGrid()}`;
  if (ask.kind === 'approval') {
    return `<div class="answers">${presenter.button('Approve', 'answer', { text: 'Approved. Go ahead and pay.', approve: true }, 'go')}${presenter.button('Decline', 'answer', { text: 'Declined. Stay within the budget.', approve: false }, 'ghostbtn')}</div>`;
  }
  const options = ask.options.length ? ask.options : ['Yes, go ahead', 'No'];
  return `<div class="answers">${options.map((o, i) => presenter.button(esc(o), 'answer', { text: o, approve: false }, i === 0 ? 'go' : 'ghostbtn')).join('')}</div>
<div class="typed"><input id="askText" placeholder="Or type an answer"><button data-act="type-answer" data-body="{}" class="ghostbtn">Send</button></div>`;
}

function askScene(ask) {
  const kicker = { 'human-check': 'The agent needs a human', approval: 'The agent needs your approval', question: 'The agent asks you' }[ask.kind];
  return `<div class="scene ask"><span class="kicker warn">${kicker}</span><h2 class="q">${esc(ask.question)}</h2>${askControls(ask)}</div>`;
}

function momentScene(m) {
  return `<div class="scene moment"><span class="kicker">${esc(m.kicker)}</span><h2>${esc(m.title)}</h2>${m.text ? `<p class="lead">${esc(m.text)}</p>` : ''}<span class="back">${esc(m.foot ?? 'Back to the agent')}</span></div>`;
}

function paidTotal(s) {
  return s.events.filter((e) => e.type === 'booking' && e.data.item === 'trip').at(-1)?.data.price ?? spent(s);
}

function endScene(s) {
  const again = presenter.on ? presenter.button('Back to the lobby', 'reset', {}, 'ghostbtn') : '';
  if (s.stopped) return `<div class="scene end"><span class="kicker warn">The agent stopped</span><h2>${esc(s.stopped)}</h2><p class="lead">${esc(s.thought ?? '')}</p>${again}</div>`;
  const lines = [s.booked.flight, s.booked.hotel].filter(Boolean).map((b) => `<div class="line"><span>${esc(b.label)}</span><b>${money(b.price)}</b></div>`).join('');
  return `<div class="scene end"><span class="kicker ok">Trip booked</span><h2>Paid ${money(paidTotal(s))}</h2><p class="lead">${esc(s.finished)}</p><div class="lines">${lines}</div>${again}</div>`;
}

const SCENES = [
  (s) => s.pendingAsk && ['ask', JSON.stringify(s.pendingAsk), () => askScene(s.pendingAsk)],
  () => { const m = currentMoment(); return m && ['moment', JSON.stringify(m), () => momentScene(m)]; },
  (s) => s.vote && ['vote', JSON.stringify([s.vote.id, s.vote.tally]), () => voteScene(s.vote)],
  (s) => (s.finished || s.stopped) && ['end', JSON.stringify([s.finished, s.stopped]), () => endScene(s)],
  (s) => s.runMode === 'idle' && ['lobby', JSON.stringify([s.mission.budget, s.audience]), () => lobby(s)],
];

function scene(s) {
  for (const pick of SCENES) {
    const found = pick(s);
    if (found) return found;
  }
  return ['none', '', () => ''];
}

function stage(s) {
  const [name, key, html] = scene(s);
  const stageKey = `${name}:${key}`;
  if (stageKey === view.stageKey) return;
  view.stageKey = stageKey;
  $('stage').innerHTML = html();
  $('stage').className = name === 'none' ? 'stage hidden' : `stage ${name}`;
  countdown();
}

function countdown() {
  const v = view.snap?.vote;
  const el = $('voteCount');
  if (!v || !el) return;
  const left = Math.max(0, Math.ceil((v.closesAt - (Date.now() + view.offset)) / 1000));
  el.textContent = `0:${String(left).padStart(2, '0')}`;
}

function render(s) {
  view.snap = s;
  view.offset = s.serverNow - Date.now();
  collectMoments(s);
  [status, mission, mirror, ghost, thinking, tele, stage].forEach((fn) => fn(s));
}

fitMirror();
window.addEventListener('resize', fitMirror);
new EventSource('/events').onmessage = (e) => render(JSON.parse(e.data));
setInterval(() => { countdown(); if (view.snap) stage(view.snap); }, 250);
