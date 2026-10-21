import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { createStageSelector, type StageUsage } from './stage-jev.js';
import { createStage, offersFor } from './stage-state.js';
import { stageActions } from './stage-controller.js';
import { renderStageSite } from './stage-site.js';
test('real Jev SDK sends cumulative conversation, observed fine print and action registry; cancellation propagates', async () => {
  let body: any, receivedSignal: AbortSignal | undefined, usage: StageUsage | undefined;
  const client = new TypeSafeClient({ apiKey: 'test-only', retry: { maxRetries: 0 }, fetch: async (_url, init) => {
    body = JSON.parse(String(init?.body)); receivedSignal = init?.signal ?? undefined;
    return new Response(JSON.stringify({ model: 'test-double', answers: { nextAction: { type: 'choice', choice: 'inspect:harbor', confidence: .8, probabilities: {} } }, usage: { input_tokens: 1, output_tokens: 1 } }));
  } });
  const state = createStage(); const page = { revision: 0, view: 'results' as const, offers: offersFor(state) };
  const signal = new AbortController().signal;
  assert.equal(await createStageSelector(client, value => { usage = value; })({ state, page, actions: stageActions(state, page, 0), history: [] }, signal), 'inspect:harbor');
  assert.ok(body.state.conversation[0].text.includes('3,000')); assert.ok(body.state.page.offers[0].finePrint.includes('Flight and hotel'));
  assert.ok(body.questions.nextAction.criteria['inspect:harbor']); assert.equal(body.questions.nextAction.criteria['ask:budget'], undefined); assert.deepEqual([Boolean(receivedSignal), usage], [true, { model: 'test-double', inputTokens: 1, outputTokens: 1 }]);
});
test('site contains only the fictional page, no real checkout or presenter authority', () => {
  const html = renderStageSite(); assert.ok(html.includes('booking-review')); assert.ok(html.includes('disabled'));
  assert.ok(!html.includes('fetch(')); assert.ok(!html.includes('api/')); assert.ok(!html.includes('iframe'));
});
