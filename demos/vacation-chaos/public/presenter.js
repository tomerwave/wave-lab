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

const button = (label, action, body, cls = '') => `<button class="${cls}" data-act="${action}" data-body='${JSON.stringify(body ?? {})}'>${label}</button>`;

function twistButtons() {
  return presenterMeta.twists.map((t) => button(t.label, 'twist', { id: t.id })).join('');
}

function buildPanel() {
  panel.innerHTML = `<div class="label">Presenter · press P to hide</div>
<h3>Run</h3>${button('Start replay', 'start-replay', {}, 'primary')}${button('Start live: local', 'start-live', { runtime: 'local' }, 'primary')}${button('Start live: AgentCore', 'start-live', { runtime: 'agentcore' }, 'primary')}${button('Turbo finale', 'turbo')}${button('Reset', 'reset')}
<h3>Agent process</h3>${button('Relaunch agent', 'launch-agent')}${button('Pull the plug', 'stop-agent')}<input id="modelId" placeholder="Brain transplant: Bedrock model id">${button('Relaunch with this model', 'launch-agent', { runtime: 'agentcore', withModel: true })}
<h3>Pace</h3>${button('Storytelling', 'pace', { pace: 'story' })}${button('Turbo', 'pace', { pace: 'turbo' })}
<h3>Crowd</h3>${button('Tackle the agent: open vote', 'vote', {}, 'primary')}${button('Close vote now', 'close-vote')}${button('Extend 15s', 'extend-vote')}
<h3>Answer the agent</h3><input id="answerText" placeholder="Your answer" value="Go ahead.">${button('Answer', 'answer', { approve: false })}${button('Approve overspend', 'answer', { approve: true })}${button('I solved the human check', 'captcha')}
<h3>Fire a twist now</h3>${twistButtons()}`;
}

function buildStartBar() {
  const bar = document.createElement('div');
  bar.className = 'startbar';
  const runtime = presenterMeta.defaultRuntime;
  bar.innerHTML = button(`Start on ${runtime === 'agentcore' ? 'AgentCore' : 'this laptop'}`, 'start-live', { runtime }, 'primary')
    + button('Approve spend', 'answer', { approve: true, text: 'Approved, go ahead.' })
    + button('Human check done', 'captcha') + button('Turbo', 'turbo') + button('Stop', 'reset') + button('More', 'more');
  document.querySelector('header.top').append(bar);
  bar.addEventListener('click', onClick);
}

function togglePanel() {
  if (!panel.innerHTML) buildPanel();
  panel.classList.toggle('hidden');
}

function bodyFor(el) {
  const body = JSON.parse(el.dataset.body);
  if (el.dataset.act === 'answer' && !body.text) body.text = document.getElementById('answerText').value;
  if (body.withModel) body.model = document.getElementById('modelId').value;
  return body;
}

async function onClick(e) {
  const el = e.target.closest('button[data-act]');
  if (!el) return;
  if (el.dataset.act === 'more') return togglePanel();
  await act(el.dataset.act, bodyFor(el));
  if (el.dataset.act === 'captcha') await act('answer', { text: 'Done, I solved the human check.', approve: false });
}

panel.addEventListener('click', onClick);
keyFromLink();
if (sessionStorage.getItem('vc_key')) buildStartBar();

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'p' || e.target.tagName === 'INPUT') return;
  togglePanel();
});
