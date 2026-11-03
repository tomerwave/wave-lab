const state = { voteId: null, choice: null };
const el = (id) => document.getElementById(id);

function optionButton(option) {
  const on = state.choice === option.id ? ' on' : '';
  return `<button class="${on.trim()}" data-id="${option.id}"><span>${option.label}</span><small>${on ? 'Your vote' : ''}</small></button>`;
}

function showVote(vote) {
  if (state.voteId !== vote.id) Object.assign(state, { voteId: vote.id, choice: null });
  el('q').textContent = vote.question;
  el('sub').textContent = `${vote.total} votes so far. Tap to vote. You can change your mind.`;
  el('options').innerHTML = vote.options.map(optionButton).join('');
  el('status').textContent = state.choice ? 'Voted. Watch the screen.' : '';
}

function showIdle(result) {
  el('q').textContent = result ? `The crowd chose: ${result.winner}` : 'Waiting for the next vote';
  el('sub').textContent = 'Keep this page open. When a vote opens, it shows up here.';
  el('options').innerHTML = '';
  el('status').textContent = '';
}

async function refresh() {
  const s = await fetch('/api/state').then((r) => r.json()).catch(() => null);
  if (!s) return;
  if (s.vote) showVote(s.vote);
  else showIdle(s.lastResult);
}

el('options').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  state.choice = b.dataset.id;
  await fetch('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionId: state.choice }) });
  void refresh();
});

void refresh();
setInterval(refresh, 1000);
