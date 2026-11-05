import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TourStop } from './tour.js';
import type { AddressInfo } from 'node:net';
import { SOCIALS } from './contact.js';
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
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', body: '{}', headers: { authorization: 'Bearer wrong' } })).status, 401);
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
  assert.equal((await fetch(`${base}/site/flights?to=Lisbon`)).status, 200);
  const res = await fetch(`${base}/site/flights/goat/book`, { method: 'POST', redirect: 'manual', body: '', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/site/hotels');
});

test('only a phone that runs the page counts as joined', async (t) => {
  const { show, base, close } = await boot();
  t.after(close);
  const page = await fetch(`${base}/vote`);
  const cookie = (page.headers.get('set-cookie') ?? '').split(';')[0]!;
  await fetch(`${base}/api/state`);
  assert.equal(show.snapshot().audience, 0);
  await fetch(`${base}/api/state`, { headers: { cookie } });
  await fetch(`${base}/api/state`, { headers: { cookie } });
  assert.equal(show.snapshot().audience, 1);
});

test('vote page hands out a voter cookie', async (t) => {
  const { base, close } = await boot();
  t.after(close);
  const page = await fetch(`${base}/vote`);
  assert.match(page.headers.get('set-cookie') ?? '', /^vc_voter=/);
  const html = await page.text();
  for (const { href } of SOCIALS) assert.ok(html.includes(`href="${href}"`), href);
});

async function agentSearch(base: string, token: string): Promise<string> {
  const entry = await fetch(`${base}/site?agent=${token}`, { redirect: 'manual' });
  const cookie = entry.headers.get('set-cookie')!.split(';')[0]!;
  await fetch(`${base}/site/flights?to=Lisbon`, { headers: { cookie } });
  return cookie;
}

test('once an agent is launched, other browsers get a read-only site', async (t) => {
  const { show, base, close } = await boot();
  t.after(close);
  show.prefillMission('Lisbon', null);
  const token = show.issueAgentToken();
  const outsider = await fetch(`${base}/site/flights/goat/book`, { method: 'POST', redirect: 'manual', body: '' });
  assert.equal(outsider.status, 200);
  assert.equal(show.snapshot().booked.flight, null);
  await fetch(`${base}/api/beacon`, { method: 'POST', body: JSON.stringify({ label: 'hacked' }) });
  assert.equal(show.snapshot().lastClick, null);
  const cookie = await agentSearch(base, token);
  const agent = await fetch(`${base}/site/flights/goat/book`, { method: 'POST', redirect: 'manual', body: '', headers: { cookie } });
  assert.equal(agent.status, 303);
  assert.ok(show.snapshot().booked.flight);
});

test('mcp calls with a stale agent token are refused', async (t) => {
  const { show, base, close } = await boot();
  t.after(close);
  show.issueAgentToken();
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', body: '{}', headers: { authorization: 'Bearer k', 'x-agent-token': 'stale' } })).status, 410);
});

test('every scenario sets up and its page renders', async (t) => {
  const { base, close } = await boot();
  t.after(close);
  const { SCENARIOS } = await import('./scenarios.js');
  for (const name of Object.keys(SCENARIOS)) {
    const res = await fetch(`${base}/api/presenter/scenario`, { method: 'POST', headers: { 'x-presenter-key': 'k' }, body: JSON.stringify({ name }) });
    const path = (await res.json()).result as string;
    assert.equal((await fetch(`${base}${path}${path.startsWith('/site') ? '?mirror=1' : ''}`)).status < 600, true, name);
  }
});

test('the code tour serves real excerpts from the files it names', async (t) => {
  const { base, close } = await boot();
  t.after(close);
  const tour = await (await fetch(`${base}/api/tour`)).json() as TourStop[];
  assert.ok(tour.length >= 8);
  const harness = tour.find((s) => s.title === 'The agent is configuration')!;
  assert.match(harness.code, /^def harness_config/);
  assert.ok(harness.start > 1);
  assert.ok(harness.tokens[0]!.some((token) => token.color !== harness.tokens[0]![0]!.color), 'the code is coloured');
  const tools = tour.find((s) => s.title === 'The tools the agent can call')!;
  assert.match(tools.code, /^server\.registerTool\(\n?\s*'think_aloud'/);
  const site = tour.find((s) => s.title === 'A site built for agents')!.views!;
  assert.ok(site[2]!.bytes < site[0]!.bytes / 2, 'the agent reads far less than the raw HTML');
  assert.match(site[1]!.text, /button "Select LY 375"|link "Select LY 375"/);
  assert.equal((await fetch(`${base}/tour`)).status, 200);
});
