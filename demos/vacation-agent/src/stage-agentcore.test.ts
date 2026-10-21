import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentCoreStageBrowser, type StageRemote } from './stage-agentcore.js';
import { createStage } from './stage-state.js';
test('AgentCore adapter uses one owned remote session, same live-view stream, visible page sync and guarded tools', async () => {
  const calls: string[] = []; let script = '';
  const remote: StageRemote = {
    async startSession(p) { assert.equal(p.timeout, 1200); calls.push('start'); }, async generateLiveViewUrl() { calls.push('stream'); return 'test-stream'; },
    async navigate(p) { assertAgentDocument(p.url); calls.push('page'); }, async evaluate(p) { script = p.script; return { offers: [], revision: 0, view: 'results' }; },
    async click(p) { calls.push(p.selector); }, async stopSession() { calls.push('close'); },
  };
  const browser = new AgentCoreStageBrowser(remote); assert.equal(await browser.start(), 'test-stream');
  await browser.sync(createStage()); assert.ok(script.includes('__stageSync')); assert.ok(script.includes('refundableHotel'));
  await browser.act('inspect:white'); await assert.rejects(browser.act('pay'), /No such/); await browser.close();
  await assert.rejects(browser.observe(), /stopped/); assert.deepEqual(calls.slice(0, 3), ['start', 'page', 'stream']);
});
test('stop while AWS start is pending cleans up the late session instead of navigating', async () => {
  let resolve!: () => void; let stops = 0; let navigations = 0;
  const remote = { startSession: async () => new Promise<void>(r => { resolve = r; }), stopSession: async () => { stops++; }, navigate: async () => { navigations++; } } as unknown as StageRemote;
  const browser = new AgentCoreStageBrowser(remote); const pending = browser.start(); await browser.close(); resolve();
  await assert.rejects(pending, /stopped/); assert.equal(navigations, 0); assert.equal(stops, 2);
});

function assertAgentDocument(url: string): void {
  assert.ok(url.startsWith('data:text/html'));
  const html = Buffer.from(url.split(',')[1], 'base64').toString('utf8');
  assert.ok(html.includes("connect-src 'none'")); assert.ok(!html.includes('id="gate"')); assert.ok(!html.includes('id="pace-toggle"'));
}
