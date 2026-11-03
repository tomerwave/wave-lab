import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Show } from '../../src/show/engine';
import { absorb, advance, emptyMoments } from './moments';

function setup() {
  let now = 1_000;
  const show = new Show({ now: () => now, sleep: () => Promise.resolve(), random: () => 0 });
  const state = emptyMoments();
  absorb(state, show.snapshot());
  return { show, state, step: (ms: number) => { now += ms; absorb(state, show.snapshot()); return now; } };
}

test('a crowd-chosen twist becomes one moment in its own voice', () => {
  const { show, state, step } = setup();
  show.prefillMission('Lisbon', null);
  show.openVote('chaos', ['heatwave', 'boss']);
  show.closeVote();
  const now = step(0);
  const moment = advance(state, now, now);
  assert.equal(moment?.look, 'alert');
  assert.equal(moment?.kicker, 'Weather alert · Extreme heat');
  assert.match(moment?.title ?? '', /pool is soup/);
  assert.equal(moment?.foot, 'Chosen by the crowd: Heatwave');
  assert.equal(state.queue.length, 0);
});

test('moments are spaced out with a breather so the crowd can watch the agent', () => {
  const { show, state, step } = setup();
  show.book('flight', 'LY 375', 640);
  show.book('hotel', 'Casa do Mar', 900);
  const now = step(0);
  assert.equal(advance(state, now, now)?.title, 'LY 375');
  assert.equal(advance(state, now + 3_600, now + 3_600), null);
  assert.equal(advance(state, now + 6_700, now + 6_700)?.title, 'Casa do Mar');
});

test('the destination result is a postcard with the city in its own voice', () => {
  const { show, state, step } = setup();
  show.beginOpening();
  show.closeVote();
  const now = step(0);
  const moment = advance(state, now, now);
  assert.equal(moment?.look, 'postcard');
  assert.equal(moment?.title, 'Lisbon');
  assert.match(moment?.text ?? '', /Seven hills/);
});

test('events from before the page loaded never replay as moments', () => {
  const { show } = setup();
  show.book('flight', 'LY 375', 640);
  const late = emptyMoments();
  absorb(late, show.snapshot());
  assert.equal(advance(late, 2_000, 2_000), null);
});

test('a moment stays up for its time, and stale moments are dropped', () => {
  const { show, state, step } = setup();
  show.book('flight', 'LY 375', 640);
  show.book('hotel', 'Casa do Mar', 900);
  const now = step(0);
  assert.equal(advance(state, now, now)?.title, 'LY 375');
  assert.equal(advance(state, now + 1_000, now + 1_000)?.title, 'LY 375');
  assert.equal(advance(state, now + 40_000, now + 40_000), null);
});

test('a reset clears queued moments', () => {
  const { show, state, step } = setup();
  show.book('flight', 'LY 375', 640);
  step(0);
  show.reset('idle');
  const now = step(1);
  assert.equal(advance(state, now, now), null);
});
