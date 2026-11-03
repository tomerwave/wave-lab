import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Show } from './show/engine.js';
import { createShowServer } from './server.js';

async function boot() {
  const show = new Show({ sleep: () => Promise.resolve() });
  const server = createShowServer(show, { port: 0, publicUrl: 'http://localhost', presenterKey: 'k' });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  return { show, base, close: () => new Promise((r) => server.close(r)) };
}

test('vote endpoint sets a cookie and counts once per cookie', async (t) => {
  const { show, base, close } = await boot();
  t.after(close);
  show.beginOpening();
  const first = await fetch(`${base}/api/vote`, { method: 'POST', body: JSON.stringify({ optionId: 'Tokyo' }), headers: { 'content-type': 'application/json' } });
  const cookie = first.headers.get('set-cookie')!.split(';')[0]!;
  assert.match(cookie, /^vc_voter=/);
  await fetch(`${base}/api/vote`, { method: 'POST', body: JSON.stringify({ optionId: 'Eilat' }), headers: { 'content-type': 'application/json', cookie } });
  const vote = show.snapshot().vote!;
  assert.equal(vote.total, 1);
  assert.equal(vote.tally.Eilat, 1);
});

test('presenter endpoints reject a missing key with 401', async (t) => {
  const { base, close } = await boot();
  t.after(close);
  assert.equal((await fetch(`${base}/api/presenter/reset`, { method: 'POST' })).status, 401);
  assert.equal((await fetch(`${base}/api/presenter/reset`, { method: 'POST', headers: { 'x-presenter-key': 'k' } })).status, 200);
});

test('mcp endpoint requires the key in the path', async (t) => {
  const { base, close } = await boot();
  t.after(close);
  assert.equal((await fetch(`${base}/mcp/wrong`, { method: 'POST', body: '{}' })).status, 404);
});

test('events endpoint streams a snapshot on change', async (t) => {
  const { show, base, close } = await boot();
  t.after(close);
  const controller = new AbortController();
  const res = await fetch(`${base}/events`, { signal: controller.signal });
  const reader = res.body!.getReader();
  show.record('thought', { text: 'hello from the agent' });
  let text = '';
  while (!text.includes('hello from the agent')) text += new TextDecoder().decode((await reader.read()).value);
  assert.match(text, /^data: /m);
  controller.abort();
});

test('site routes render and redirect through the server', async (t) => {
  const { show, base, close } = await boot();
  t.after(close);
  show.prefillMission('Lisbon', null);
  assert.equal((await fetch(`${base}/site/flights`)).status, 200);
  const res = await fetch(`${base}/site/flights/goat/book`, { method: 'POST', redirect: 'manual', body: '', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/site/hotels');
});
