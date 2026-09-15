import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noopObserve, isValidationError } from '@mastra/core/tools';
import { Billing } from './billing.js';
import { createBillingTools } from './tools.js';
import { createRefundWorkflow } from './workflow.js';
import { createSupportAgent } from './agent.js';
const context = { observe: noopObserve };

test('server authorizes, checks policy and has no side effects on rejection', () => {
  const b = new Billing(['team_a'], 'duplicate');
  for (const [id, status] of [['missing', 'not_found'], ['pay_b', 'forbidden'], ['pay_a', 'needs_review'], ['pay_large', 'needs_review']]) assert.equal(b.refund(id!).status, status);
  assert.equal(b.refundCount, 0);
  assert.equal(b.refund('pay_dup').status, 'refunded_in_simulation');
});
test('unsafe and guarded demonstrate different behavior for exactly the same charge', () => {
  const unsafe = new Billing(), guarded = new Billing();
  assert.equal(unsafe.unsafeRefund('pay_b').status, 'refunded_in_simulation');
  assert.equal(guarded.refund('pay_b').status, 'forbidden');
  assert.equal(guarded.refundCount, 0);
});
test('reads do not leak another account and returned objects cannot mutate policy', () => {
  const b = new Billing();
  assert.deepEqual(b.getCharges('team_b'), { status: 'forbidden' });
  const charges = b.getCharges('team_a');
  assert.ok(Array.isArray(charges)); charges[0]!.duplicate = true;
  assert.equal(b.refund('pay_a').status, 'needs_review');
});
test('Mastra tool validates input and rejects forged permission fields', async () => {
  const b = new Billing(); const t = createBillingTools(b);
  const invalid = await t.refund.execute!({ chargeId: '' }, context);
  assert.ok(isValidationError(invalid));
  const forgedInput = { chargeId: 'pay_b', authorized: true };
  const forged = await t.refund.execute!(forgedInput, context);
  assert.ok(isValidationError(forged));
  assert.equal(b.refundCount, 0);
  assert.deepEqual(await t.getCharges.execute!({ accountId: 'team_b' }, context), { status: 'forbidden' });
});
test('100 scheduled Mastra tool calls plus retry record one refund', async () => {
  const b = new Billing(['team_a'], 'duplicate'); const t = createBillingTools(b).refund;
  const results = await Promise.all(Array.from({length: 100}, () => t.execute!({chargeId: 'pay_dup'}, context)));
  for (const r of results) assert.deepEqual(r, results[0]);
  assert.deepEqual(await t.execute!({chargeId: 'pay_dup'}, context), results[0]);
  assert.equal(b.refundCount, 1);
});
test('real Mastra workflow succeeds and policy still blocks foreign account', async () => {
  const b = new Billing(['team_a'], 'duplicate'); const workflow = createRefundWorkflow(b);
  const first = await (await workflow.createRun()).start({inputData: {chargeId: 'pay_dup'}});
  assert.equal(first.status, 'success');
  if (first.status === 'success') assert.equal(first.result.status, 'refunded_in_simulation');
  const second = await (await workflow.createRun()).start({inputData: {chargeId: 'pay_b'}});
  assert.equal(second.status, 'success');
  if (second.status === 'success') assert.equal(second.result.status, 'forbidden');
  assert.equal(b.refundCount, 1);
});
test('Mastra agent is constructed with only the three protected tools', async () => {
  const agent = createSupportAgent(new Billing(), 'openai/gpt-4.1-mini');
  assert.deepEqual(Object.keys(await agent.listTools()).sort(), ['getCharges', 'listAccounts', 'refund']);
});
