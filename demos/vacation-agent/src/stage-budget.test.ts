import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JevBudget } from './stage-budget.js';
function fixture() { const dir = mkdtempSync(join(tmpdir(), 'jev-budget-')); return { path: join(dir, 'ledger.json'), close: () => rmSync(dir, { recursive: true }) }; }
const response = () => new Response(JSON.stringify({ model: 'test-model', usage: { input_tokens: 1000, output_tokens: 2 } }));
test('request reservations survive restart and stop before USD20 total including historical reserve; only usage metadata is stored', async () => {
  const f = fixture(); let calls = 0;
  try {
    const transport = async () => { calls++; return response(); };
    for (let i = 0; i < 800; i++) await new JevBudget(f.path, transport).fetch('https://api.typesafe.ai/v1/systemone', { body: '{"model":"jev-1.13.0"}' });
    await assert.rejects(new JevBudget(f.path, transport).fetch('https://api.typesafe.ai/v1/systemone', { body: '{"model":"jev-1.13.0"}' }), /limit/);
    const summary = new JevBudget(f.path).summary();
    assert.equal(calls, 800); assert.equal(summary.inputTokens, 800000); assert.ok(summary.reservedUsd + summary.historicalReservationUsd < 20); assert.equal(summary.uncertain, 0);
  } finally { f.close(); }
});
test('uncertain network request blocks further calls and oversize input is blocked before transmission', async () => {
  const f = fixture(); let calls = 0;
  const transport = async () => { calls++; throw new Error('network'); };
  try {
    const budget = new JevBudget(f.path, transport);
    await assert.rejects(budget.fetch('https://api.typesafe.ai/v1/systemone', { body: 'x'.repeat(60001) }), /size/);
    await assert.rejects(budget.fetch('https://api.typesafe.ai/v1/systemone', { body: '{"model":"jev-1.13.0"}' }), /uncertain/);
    await assert.rejects(budget.fetch('https://api.typesafe.ai/v1/systemone', { body: '{"model":"jev-1.13.0"}' }), /reconcile/); assert.equal(calls, 1);
  } finally { f.close(); }
});
test('unpriced model, foreign endpoint and long context reject before transmission or reservation', async () => {
  const f = fixture(); let calls = 0;
  const budget = new JevBudget(f.path, async () => { calls++; return response(); });
  try {
    await assert.rejects(budget.fetch('https://api.typesafe.ai/v1/systemone', { body: '{"model":"other"}' }), /priced/);
    await assert.rejects(budget.fetch('https://other.example/v1/systemone'), /endpoint/);
    await assert.rejects(budget.fetch('https://api.typesafe.ai/v1/systemone', { body: '{"model":"jev-1.13.0"}', headers: { 'TypeSafe-Danger-Zone-Long-Context': 'true' } }), /Long context/);
    assert.equal(calls, 0); assert.equal(budget.summary().requests, 0);
  } finally { f.close(); }
});
