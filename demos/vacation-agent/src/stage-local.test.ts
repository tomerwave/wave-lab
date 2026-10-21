import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalStageController } from './stage-local.js';

test('manual local rehearsal handles votes, cumulative questions and policy without claiming AI or AWS', async () => {
  const c = new LocalStageController(); await c.start(); c.action('inspect:harbor', 0);
  assert.equal(c.status, 'checkpoint'); c.vote(c.checkpoint!.id, 'children');
  assert.equal(c.question!.kind, 'budget'); c.answer(c.question!.id, { budgetNis: 6000 }); c.action('inspect:harbor', c.state.revision);
  c.vote(c.checkpoint!.id, 'halve-budget'); c.action('inspect:white', c.state.revision);
  finishLocal(c);
  assert.equal(c.status, 'review'); assert.equal(c.liveViewUrl, undefined); assert.equal(c.snapshot().mode, 'local-manual-no-ai');
});

function finishLocal(c: LocalStageController) {
  assert.equal(c.question!.kind, 'destination'); c.answer(c.question!.id, { choice: 'explore-fictional' });
  c.action('inspect:white', c.state.revision); c.action('inspect:flash', c.state.revision);
  assert.equal(c.question!.kind, 'cancellation'); c.answer(c.question!.id, { choice: 'retain' });
  assert.throws(() => c.action('review:flash', c.state.revision)); c.action('inspect:white', c.state.revision); c.action('review:white', c.state.revision);
}
