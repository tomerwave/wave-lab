const panel = document.getElementById('overlay');
const presenterMeta = JSON.parse(document.getElementById('meta').textContent);

function keyFromLink() {
  const key = new URLSearchParams(location.hash.slice(1)).get('key');
  if (!key) return;
  sessionStorage.setItem('vc_key', key);
  history.replaceState(null, '', location.pathname);
}

function presenterKey() {
  let key = sessionStorage.getItem('vc_key');
  if (!key) {
    key = prompt('Presenter key (printed when the server started)') ?? '';
    sessionStorage.setItem('vc_key', key);
  }
  return key;
}

async function act(action, body = {}) {
  const res = await fetch(`/api/presenter/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-presenter-key': presenterKey() }, body: JSON.stringify(body) });
  if (res.status === 401) sessionStorage.removeItem('vc_key');
}

const attr = (v) => v.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const button = (label, action, body, cls = '') => `<button class="${cls}" data-act="${action}" data-body='${attr(JSON.stringify(body ?? {}))}'>${label}</button>`;

async function start() {
  await act('pace', { pace: 'story' });
  await act('start-live', { runtime: presenterMeta.defaultRuntime });
}

async function humanCheckDone() {
  await act('captcha');
  await act('answer', { text: 'Done, I solved the human check.', approve: false });
}

function pickGoat(cell) {
  if (!cell.classList.contains('goat')) {
    cell.classList.remove('nope');
    void cell.offsetWidth;
    cell.classList.add('nope');
    return;
  }
  cell.classList.add('picked');
  const grid = cell.parentElement;
  if (grid.querySelectorAll('.goat:not(.picked)').length === 0) void humanCheckDone();
}

function typedAnswer() {
  const text = document.getElementById('askText')?.value.trim();
  if (text) void act('answer', { text, approve: false });
}

const SPECIAL = { start, 'type-answer': typedAnswer, more: togglePanel };

function onClick(e) {
  const goat = e.target.closest('[data-goat]');
  if (goat) return pickGoat(goat);
  const el = e.target.closest('button[data-act]');
  if (!el) return;
  const special = SPECIAL[el.dataset.act];
  if (special) return special();
  void act(el.dataset.act, JSON.parse(el.dataset.body));
}

function buildPanel() {
  const twists = presenterMeta.twists.map((t) => button(t.label, 'twist', { id: t.id })).join('');
  panel.innerHTML = `<div class="label">Backstage · press P to hide</div>
<h3>Run</h3>${button('Start', 'start', {}, 'primary')}${button('Start on this laptop', 'start-live', { runtime: 'local' })}${button('Scripted replay', 'start-replay')}${button('Turbo finale', 'turbo')}${button('Stop and go back to the lobby', 'reset')}
<h3>Pace</h3>${button('Storytelling', 'pace', { pace: 'story' })}${button('Turbo', 'pace', { pace: 'turbo' })}
<h3>Crowd</h3>${button('Open a vote', 'vote')}${button('Close vote now', 'close-vote')}${button('Extend 15s', 'extend-vote')}
<h3>Fire a twist now</h3>${twists}`;
}

function togglePanel() {
  if (!panel.innerHTML) buildPanel();
  panel.classList.toggle('hidden');
}

keyFromLink();
window.presenter = { on: Boolean(sessionStorage.getItem('vc_key')), button };
document.addEventListener('click', onClick);
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'p' || e.target.tagName === 'INPUT') return;
  togglePanel();
});
