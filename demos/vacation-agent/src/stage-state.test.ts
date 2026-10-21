import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStage, applyScenario, answerHuman, checkpointChoices, offerProblems, offersFor } from './stage-state.js';

test('opening is one traveler, four days, 3000 NIS and both cancellations without a clean requirement', () => {
  const s = createStage();
  assert.deepEqual(s.requirements.party, { adults: 1, children: 0, infants: 0, crib: false });
  assert.equal(s.requirements.days, 4); assert.equal(s.requirements.budgetNis, 3000);
  assert.deepEqual(s.requirements.cancellation, { flight: true, hotel: true });
  assert.equal(s.requirements.cleanWhite, false);
  assert.deepEqual(checkpointChoices(s, 1).map(x => x.id), ['girlfriend', 'children']);
});
test('party change is cumulative, budget is never silently raised, duplicate event is idempotent', () => {
  const s = createStage();
  applyScenario(s, 'event-1', 'children'); applyScenario(s, 'event-1', 'children');
  assert.deepEqual(s.requirements.party, { adults: 1, children: 1, infants: 1, crib: true });
  assert.equal(s.requirements.budgetNis, 3000); assert.equal(s.budgetPending, true);
  answerHuman(s, 'budget', { budgetNis: 6200 });
  applyScenario(s, 'event-2', 'halve-budget'); applyScenario(s, 'event-2', 'halve-budget');
  assert.equal(s.requirements.budgetNis, 3100);
  assert.ok(s.conversation.some(x => x.role === 'user' && x.text.includes('6200')));
  assert.throws(() => answerHuman(s, 'budget', { budgetNis: -1 }));
});
test('second choices depend on joining party; dates shift seven days and rejection changes actual offers', () => {
  const s = createStage(); applyScenario(s, 'one', 'girlfriend');
  assert.ok(checkpointChoices(s, 2).some(x => x.id === 'clean-hotel'));
  assert.ok(!checkpointChoices(s, 2).some(x => x.id === 'hotel-refusal'));
  const before = s.requirements.departure; applyScenario(s, 'two', 'later');
  assert.equal(Date.parse(s.requirements.departure) - Date.parse(before), 7 * 86400000);
  applyScenario(s, 'three', 'clean-hotel', 'harbor');
  assert.ok(offerProblems(offersFor(s).find(x => x.id === 'harbor')!, s).includes('clean_white'));
});
test('world change is visible data, requires destination clarification and does not drop cancellation', () => {
  const s = createStage(); applyScenario(s, 'world', 'iran');
  assert.equal(s.world.iran, true); assert.equal(s.destinationPending, true);
  assert.ok(offersFor(s).every(x => x.country === 'Iran'));
  assert.equal(s.requirements.cancellation.hotel, true);
  answerHuman(s, 'destination', { choice: 'explore-fictional' });
  assert.equal(s.destinationPending, false);
});
test('great offer matches approved party/date/budget but exposes both nonrefundable components', () => {
  const s = createStage(); applyScenario(s, 'one', 'children'); answerHuman(s, 'budget', { budgetNis: 7000 });
  applyScenario(s, 'world', 'iran'); answerHuman(s, 'destination', { choice: 'explore-fictional' });
  applyScenario(s, 'offer', 'great-offer');
  const offer = offersFor(s).find(x => x.id === 'flash')!;
  assert.deepEqual([offer.party.infants, offer.crib], [1, true]);
  assert.ok(offer.totalNis <= s.requirements.budgetNis);
  assert.deepEqual(offerProblems(offer, s), ['flight_cancellation', 'hotel_cancellation']);
  answerHuman(s, 'cancellation', { choice: 'compare' });
  assert.equal(s.requirements.cancellation.hotel, true);
  answerHuman(s, 'cancellation', { choice: 'waive-both' });
  assert.deepEqual(offerProblems(offer, s), []);
});

test('accountant halves an odd approved budget exactly, including half a shekel', () => {
  const s = createStage(); answerHuman(s, 'budget', { budgetNis: 5001 }); applyScenario(s, 'halve', 'halve-budget');
  assert.equal(s.requirements.budgetNis, 2500.5);
});

test('cancellation answers reject inherited object keys without changing state', () => {
  const s = createStage();
  for (const choice of ['toString', 'constructor']) assert.throws(() => answerHuman(s, 'cancellation', { choice }));
  assert.equal(s.cancellationChoice, undefined); assert.doesNotThrow(() => structuredClone(s));
});
