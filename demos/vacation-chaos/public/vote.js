const state = { voteId: null, choice: null, offset: 0, vote: null };
const el = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function pct(vote, id) {
  return vote.total ? Math.round((vote.tally[id] / vote.total) * 100) : 0;
}

function results(vote, option) {
  if (!state.choice) return { fill: '', share: '' };
  const p = pct(vote, option.id);
  return { fill: `<i class="fill" style="width:${p}%"></i>`, share: `<span class="pct">${p}%</span>` };
}

function optionButton(vote, option) {
  const mine = state.choice === option.id;
  const { fill, share } = results(vote, option);
  const blurb = option.blurb ? `<small>${esc(option.blurb)}</small>` : '';
  return `<button class="${mine ? 'on' : ''}" data-id="${esc(option.id)}">${fill}<span class="txt"><b>${esc(option.label)}</b>${blurb}</span>${share}${mine ? '<span class="tick">Your vote</span>' : ''}</button>`;
}

function showHeadsUp(vote) {
  const left = Math.max(1, Math.ceil((vote.opensAt - (Date.now() + state.offset)) / 1000));
  el('kicker').textContent = 'Get ready';
  el('q').textContent = vote.question;
  el('sub').textContent = `Voting opens in ${left} second${left === 1 ? '' : 's'}. Look at the big screen.`;
  el('options').innerHTML = '';
  el('status').textContent = '';
}

function showVote(vote) {
  if (vote.opensAt > Date.now() + state.offset) return showHeadsUp(vote);
  if (state.voteId !== vote.id) Object.assign(state, { voteId: vote.id, choice: null });
  state.vote = vote;
  el('kicker').textContent = 'Crowd vote · live';
  el('q').textContent = vote.question;
  el('sub').textContent = `${vote.total} vote${vote.total === 1 ? '' : 's'} so far. Tap to vote, tap again to change.`;
  el('options').innerHTML = vote.options.map((o) => optionButton(vote, o)).join('');
  el('status').textContent = state.choice ? 'Voted. Watch the big screen.' : '';
}

function showIdle(s) {
  const result = s.lastResult;
  state.vote = null;
  el('kicker').textContent = result ? 'Last vote' : 'You are in';
  el('q').textContent = result ? result.winner : s.runMode === 'idle' ? 'The show starts in a moment' : 'Waiting for the next vote';
  el('sub').textContent = result ? `The crowd decided with ${result.total} votes. Next vote opens soon.` : 'Keep this page open. When it is your turn to vote, it pops up right here.';
  el('options').innerHTML = '';
  el('status').textContent = '';
  el('timer').textContent = '';
  el('timebar').style.width = '0%';
}

function tick() {
  const v = state.vote;
  if (!v) return;
  const left = Math.max(0, v.closesAt - (Date.now() + state.offset));
  const seconds = Math.ceil(left / 1000);
  el('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  el('timebar').style.width = `${Math.min(100, (left / (v.closesAt - v.opensAt)) * 100)}%`;
}

async function refresh() {
  const s = await fetch('/api/state').then((r) => r.json()).catch(() => null);
  if (!s) return;
  state.offset = s.serverNow - Date.now();
  el('thought').textContent = s.thought ?? 'Waiting for the mission.';
  el('live').classList.toggle('off', s.runMode === 'idle');
  if (s.vote) showVote(s.vote);
  else showIdle(s);
  tick();
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
setInterval(tick, 250);
