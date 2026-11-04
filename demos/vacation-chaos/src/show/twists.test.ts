import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TWISTS, CHAOS_POOL, DESTINATIONS, RULES } from './twists.js';
import { OUTAGE_MS, freshMission, freshSite } from './types.js';

const emoji = /\p{Extended_Pictographic}/u;

test('every pool twist has inbox copy, replay lines and no emoji', () => {
  assert.ok(CHAOS_POOL.length >= 10);
  for (const twist of Object.values(TWISTS)) {
    assert.ok(twist.inbox.length > 10, twist.id);
    assert.ok(twist.replay.length >= 2, twist.id);
    for (const text of [twist.label, twist.blurb, twist.inbox, ...twist.replay]) assert.doesNotMatch(text, emoji, twist.id);
  }
  for (const option of [...DESTINATIONS, ...RULES]) assert.doesNotMatch(option.label, emoji);
});

test('chaos pool only references vote twists', () => {
  for (const id of CHAOS_POOL) assert.equal(TWISTS[id]?.kind, 'vote', id);
});

test('plus-one adds a traveller and a sea-view must', () => {
  const mission = freshMission(), site = freshSite();
  TWISTS['plus-one']!.apply(mission, site, 0);
  assert.deepEqual(mission.travellers, ['Tomer', 'Girlfriend']);
  assert.ok(mission.musts.includes('Sea view'));
  assert.ok(mission.musts.includes('Bathtub'));
});

test('oil-shock sets news and the boss sets nights to 2', () => {
  const mission = freshMission(), site = freshSite();
  TWISTS['oil-shock']!.apply(mission, site, 0);
  assert.match(site.news ?? '', /Oil/);
  assert.equal(site.fareMultiplier, 3);
  TWISTS['boss']!.apply(mission, site, 0);
  assert.equal(mission.nights, 2);
});

test('intern deploy opens a short outage', () => {
  const site = freshSite();
  TWISTS['intern-deploy']!.apply(freshMission(), site, 1000);
  assert.equal(site.outageUntil, 1000 + OUTAGE_MS);
});
