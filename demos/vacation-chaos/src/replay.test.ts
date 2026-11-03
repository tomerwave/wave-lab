import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Show } from './show/engine.js';
import { handleSite } from './site/handler.js';
import { runReplay } from './replay.js';

test('replay completes to done and books a flight and a hotel', async () => {
  let now = 0;
  const show = new Show({ now: () => now, sleep: () => Promise.resolve(), random: () => 0 });
  show.reset('replay');
  show.onChange((s) => {
    if (s.vote) queueMicrotask(() => { now = s.vote!.closesAt; show.tick(); });
    if (s.pendingAsk) queueMicrotask(() => { show.site.captcha = 'solved'; show.answer('Go ahead.', true); });
  });
  show.beginOpening();
  await runReplay(show, (req) => handleSite(show, req), async (ms) => { now += ms; });
  const snap = show.snapshot();
  assert.ok(snap.finished);
  assert.ok(snap.booked.flight);
  assert.ok(snap.booked.hotel);
  assert.equal(snap.route, '/site/done');
  assert.equal(snap.chaosVotes, 2);
  assert.ok(snap.events.some((e) => e.type === 'click'));
});
