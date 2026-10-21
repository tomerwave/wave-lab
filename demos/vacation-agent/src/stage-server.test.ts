import assert from 'node:assert/strict';
import { test } from 'node:test';
import { request } from 'node:http';
import { createStageServer } from './stage-server.js';

test('offline dashboard never starts paid services; local API rejects foreign origin and Host', async () => {
  let starts = 0; const app = createStageServer({ liveEnabled: false, createRun: () => { starts++; throw new Error('must not start'); } });
  await new Promise<void>(r => app.server.listen(0, '127.0.0.1', r));
  const address = app.server.address(); assert.ok(address && typeof address !== 'string'); const url = `http://127.0.0.1:${address.port}`;
  try {
    await assertBasicReads(url);
    assert.equal((await fetch(`${url}/api/start`, { method: 'POST', headers: { Origin: 'https://foreign.example' }, body: '{}' })).status, 403);
    assert.equal((await fetch(`${url}/api/start`, { method: 'POST', headers: { Origin: url }, body: '{}' })).status, 409);
    await assertForeignHost(url);
    assert.equal(starts, 0);
    await assertReplayAssets(url);
  } finally { await app.close(); }
});

async function assertBasicReads(url: string) {
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await fetch(`${url}/api/state`)).status, 200);
}
async function assertForeignHost(url: string) {
    const foreignStatus = await new Promise<number | undefined>((resolve, reject) => { const req = request(`${url}/api/state`, { headers: { Host: 'foreign.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); });
    assert.equal(foreignStatus, 403);
}

async function assertReplayAssets(url: string) {
    const replay = await (await fetch(`${url}/api/replay`)).text(); assert.ok(!replay.includes('signedUrl'));
    assert.equal((await fetch(`${url}/dcv/dcv.js`)).status, 200);
    assert.equal((await fetch(`${url}/dcv/no-file`)).status, 404);
}

import { StageController } from './stage-controller.js';
import { offersFor, createStage } from './stage-state.js';
function testRun() {
  const state = createStage();
  return new StageController({ start: async () => 'test-only-signed-stream', sync: async () => undefined,
    observe: async () => ({ revision: state.revision, view: 'results', offers: offersFor(state) }), act: async () => undefined, close: async () => undefined,
  }, async () => 'ask:budget');
}
async function withLiveTestServer(check: (url: string) => Promise<void>) {
  const app = createStageServer({ liveEnabled: true, createRun: testRun });
  await new Promise<void>(r => app.server.listen(0, '127.0.0.1', r)); const address = app.server.address(); assert.ok(address && typeof address !== 'string');
  try { await check(`http://127.0.0.1:${address.port}`); } finally { await app.close(); }
}
async function postControl(url: string, path: string, data: Record<string, unknown> = {}) {
  return fetch(`${url}/api/${path}`, { method: 'POST', headers: { Origin: url }, body: JSON.stringify(data) });
}
test('start waits for a viewer before decisions, stale commands reject, reset archives a URL-free transcript (test transport)', async () => {
  await withLiveTestServer(async url => {
    const start = await postControl(url, 'start'); const { runId } = await start.json();
    const before = await (await fetch(`${url}/api/state`)).json(); assert.deepEqual([before.run.status, before.run.decisions], ['paused', 0]);
    assert.equal((await postControl(url, 'ready', { runId: 'stale' })).status, 409);
    await postControl(url, 'ready', { runId });
    const after = await (await fetch(`${url}/api/state`)).json(); assert.equal(after.run.status, 'question');
    await postControl(url, 'reset', { runId }); const replay = await (await fetch(`${url}/api/replay`)).text();
    assert.ok(replay.includes('ask:budget')); assert.ok(!replay.includes('test-only-signed-stream'));
    assert.equal((await postControl(url, 'stop', { runId })).status, 409);
  });
});

test('live stream stays hidden during delayed initial page sync so first-frame readiness cannot race startup', async () => {
  let finish!: () => void;
  const run = new StageController({ start: async () => 'test-delayed-stream', sync: async () => new Promise<void>(r => { finish = r; }), observe: async () => { throw new Error('not reached'); }, act: async () => undefined, close: async () => undefined }, async () => 'ask:budget');
  const app = createStageServer({ liveEnabled: true, createRun: () => run });
  await new Promise<void>(r => app.server.listen(0, '127.0.0.1', r)); const address = app.server.address(); assert.ok(address && typeof address !== 'string');
  try { await assertDelayedStartup(`http://127.0.0.1:${address.port}`, () => finish()); }
  finally { await app.close(); }
});
async function assertDelayedStartup(url: string, finish: () => void) {
  const start = postControl(url, 'start');
  let state: any;
  do { state = await (await fetch(`${url}/api/state`)).json(); } while (!state.run);
  assert.deepEqual([state.run.status, state.streamAvailable], ['starting', false]);
  assert.equal((await fetch(`${url}/api/live-view`)).status, 409);
  finish(); await start;
  const after = await (await fetch(`${url}/api/state`)).json();
  assert.deepEqual([after.run.status, after.streamAvailable], ['paused', true]);
}
