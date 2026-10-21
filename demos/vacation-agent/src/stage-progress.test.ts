import assert from 'node:assert/strict';
import { test } from 'node:test';
import { minimumBudget } from './stage-progress.js';
import { createStage, offersFor } from './stage-state.js';
test('minimum comes only from observed inventory satisfying traveler, dates, availability and refund constraints', () => {
  const state = createStage(); const inventory = offersFor(state);
  assert.equal(minimumBudget(state, []), undefined);
  inventory[0].available = false; inventory[1].departure = '2026-12-01'; inventory[2].refundableHotel = false;
  assert.equal(minimumBudget(state, inventory), undefined);
  inventory[2].refundableHotel = true; assert.equal(minimumBudget(state, inventory), inventory[2].totalNis);
});
