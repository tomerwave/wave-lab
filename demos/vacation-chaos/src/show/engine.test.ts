import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEADS_UP_MS, Show, VOTE_MS } from './engine.js';

const WHOLE_VOTE = HEADS_UP_MS + VOTE_MS;

function harness() {
  let now = 0;
  const slept: number[] = [];
  const show = new Show({ now: () => now, sleep: async (ms) => { slept.push(ms); }, random: () => 0 });
  const advance = (ms: number) => { now += ms; show.tick(); };
  const flush = () => new Promise((r) => setImmediate(r));
  return { show, advance, slept, flush };
}

function finishOpening(h: ReturnType<typeof harness>) {
  h.show.beginOpening();
  h.advance(WHOLE_VOTE);
  h.advance(WHOLE_VOTE);
}

test('castVote twice from one voter counts once', () => {
  const { show } = harness();
  show.beginOpening();
  show.castVote('phone-1', 'Tokyo');
  show.castVote('phone-1', 'Eilat');
  const vote = show.snapshot().vote!;
  assert.equal(vote.tally.Tokyo, 0);
  assert.equal(vote.tally.Eilat, 1);
  assert.equal(vote.total, 1);
});

test('closeVote with no votes picks the first option', () => {
  const { show } = harness();
  show.beginOpening();
  assert.equal(show.closeVote(), 'Lisbon');
  assert.equal(show.snapshot().mission.destination, 'Lisbon');
});

test('votes close by themselves after 30 seconds and the rule vote follows', () => {
  const h = harness();
  h.show.beginOpening();
  h.show.castVote('a', 'Tokyo');
  h.advance(WHOLE_VOTE);
  assert.equal(h.show.snapshot().mission.destination, 'Tokyo');
  assert.equal(h.show.snapshot().vote?.target, 'rule');
  h.advance(WHOLE_VOTE);
  assert.equal(h.show.snapshot().mission.ready, true);
  assert.deepEqual(h.show.snapshot().mission.nevers, ['No red-eye flights']);
});

test('think blocks until opening votes finish', async () => {
  const h = harness();
  h.show.beginOpening();
  let done = false;
  const reply = h.show.think('Reading the mission.').then((r) => { done = true; return r; });
  await h.flush();
  assert.equal(done, false);
  h.advance(WHOLE_VOTE); h.advance(WHOLE_VOTE);
  const r = await reply;
  assert.equal(r.mission.destination, 'Lisbon');
});

test('think blocks while a chaos vote is open then returns its inbox', async () => {
  const h = harness();
  finishOpening(h);
  const vote = h.show.openVote('chaos')!;
  let done = false;
  const reply = h.show.think('Picking a flight.').then((r) => { done = true; return r; });
  await h.flush();
  assert.equal(done, false);
  h.show.castVote('a', vote.options[1]!.id);
  h.advance(WHOLE_VOTE);
  const r = await reply;
  assert.equal(r.inbox.length, 1);
  assert.equal(h.show.snapshot().applied.includes(vote.options[1]!.id), true);
});

test('story pace sleeps 2500ms per think, turbo 0', async () => {
  const h = harness();
  finishOpening(h);
  await h.show.think('one');
  h.show.setPace('turbo');
  await h.show.think('two');
  assert.deepEqual(h.slept, [2500, 0]);
});

test('chaos vote never offers an already applied twist', () => {
  const h = harness();
  finishOpening(h);
  const first = h.show.openVote('chaos')!;
  const winner = h.show.closeVote();
  const second = h.show.openVote('chaos')!;
  assert.equal(first.options.length, 3);
  assert.ok(!second.options.some((o) => o.id === winner));
});

test('ask resolves when the presenter answers and can approve overspend', async () => {
  const h = harness();
  const answer = h.show.ask('Over budget by $200. OK?');
  assert.deepEqual(h.show.snapshot().pendingAsk, { question: 'Over budget by $200. OK?', kind: 'question', options: [] });
  h.show.answer('Yes, go.', true);
  assert.equal(await answer, 'Yes, go.');
  assert.equal(h.show.snapshot().approvedOverspend, true);
  assert.equal(h.show.snapshot().pendingAsk, null);
});

test('checkpoints only move forward and reset clears the run', () => {
  const h = harness();
  h.show.checkpoint(5);
  h.show.checkpoint(3);
  assert.equal(h.show.snapshot().checkpoint, 5);
  h.show.reset('replay');
  assert.equal(h.show.snapshot().checkpoint, 0);
  assert.equal(h.show.snapshot().runMode, 'replay');
});

test('flight-only twists leave the pool once a flight is booked', () => {
  const h = harness();
  finishOpening(h);
  h.show.book('flight', 'LY 375', 640);
  for (let i = 0; i < 4; i++) {
    const vote = h.show.openVote('chaos')!;
    assert.ok(!vote.options.some((o) => o.id === 'strike' || o.id === 'ex'));
    h.show.closeVote();
  }
});

test('reset cancels tool calls waiting from the previous run', async () => {
  const h = harness();
  h.show.beginOpening();
  const stale = h.show.think('old run');
  h.show.reset('local');
  await assert.rejects(stale, /run ended/);
});

test('a repeated ask reuses the pending question', async () => {
  const h = harness();
  const first = h.show.ask('Approve?');
  const second = h.show.ask('Approve?');
  h.show.answer('Yes');
  assert.equal(await first, 'Yes');
  assert.equal(await second, 'Yes');
});

test('reset rejects an unanswered ask', async () => {
  const h = harness();
  const ask = h.show.ask('Approve?');
  h.show.reset('idle');
  await assert.rejects(ask, /run ended/);
});

test('an empty chaos pool opens no vote and tick never throws', () => {
  const h = harness();
  finishOpening(h);
  for (let i = 0; i < 12; i++) { h.show.openVote('chaos'); h.show.closeVote(); }
  assert.equal(h.show.openVote('chaos'), null);
  assert.doesNotThrow(() => h.advance(60_000));
});

test('an ask carries its kind and options so Mission Control can draw the controls', () => {
  const h = harness();
  h.show.ask('Over budget. May I pay?', 'approval').catch(() => undefined);
  assert.deepEqual(h.show.snapshot().pendingAsk, { question: 'Over budget. May I pay?', kind: 'approval', options: [] });
});

test('the chosen budget survives a reset and is locked once the mission is ready', () => {
  const h = harness();
  h.show.setBudget(1500);
  h.show.reset('local');
  assert.equal(h.show.mission.budget, 1500);
  h.show.prefillMission('Lisbon', null);
  h.show.setBudget(9000);
  assert.equal(h.show.mission.budget, 1500);
});

test('phones that join before the show are still counted after a reset', () => {
  const h = harness();
  h.show.join('a');
  h.show.join('a');
  h.show.join('b');
  h.show.reset('agentcore');
  assert.equal(h.show.snapshot().audience, 2);
});

test('an agent that stops without finishing is reported once, and never after a finish', () => {
  const h = harness();
  h.show.agentStopped('Out of steps');
  h.show.agentStopped('Again');
  assert.equal(h.show.snapshot().stopped, 'Out of steps');
  h.show.reset('local');
  h.show.finish('Done');
  h.show.agentStopped('Late exit');
  assert.equal(h.show.snapshot().stopped, null);
});

test('a twist event says whether the crowd chose it', () => {
  const h = harness();
  h.show.prefillMission('Lisbon', null);
  h.show.openVote('chaos', ['heatwave', 'boss']);
  h.show.closeVote();
  h.show.applyTwist('oil-shock');
  const twists = h.show.snapshot().events.filter((e) => e.type === 'twist').map((e) => e.data);
  assert.deepEqual(twists.map((t) => [t.id, t.by]), [['heatwave', 'crowd'], ['oil-shock', 'world']]);
});
