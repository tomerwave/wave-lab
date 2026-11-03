import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Show } from './show/engine.js';
import { createShowServer } from './server.js';
import { AgentLauncher } from './launcher.js';
import type { Decider } from './jev.js';

async function connect(decider?: Decider) {
  const show = new Show({ sleep: () => Promise.resolve() });
  show.prefillMission('Tokyo', null);
  const config = { port: 0, publicUrl: 'http://localhost', presenterKey: 'k' };
  const server = createShowServer(show, config, new AgentLauncher(config), decider);
  await new Promise<void>((r) => server.listen(0, r));
  const url = new URL(`http://localhost:${(server.address() as AddressInfo).port}/mcp`);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { authorization: 'Bearer k' } } }));
  const close = async () => { await client.close(); await new Promise((r) => server.close(r)); };
  return { show, client, close };
}

const text = (result: unknown) => JSON.parse((result as { content: Array<{ text: string }> }).content[0]!.text);

test('lists exactly five show tools', async (t) => {
  const { client, close } = await connect();
  t.after(close);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((x) => x.name).sort(), ['ask_presenter', 'check_inbox', 'finish', 'report_booking', 'think_aloud']);
});

test('think_aloud returns the inbox and records a thought', async (t) => {
  const { show, client, close } = await connect();
  t.after(close);
  show.applyTwist('boss');
  const reply = text(await client.callTool({ name: 'think_aloud', arguments: { thought: 'Reading the mission.' } }));
  assert.equal(reply.mission.destination, 'Tokyo');
  assert.equal(reply.inbox.length, 1);
  assert.equal(show.snapshot().thought, 'Reading the mission.');
});

test('oversized thought is rejected', async (t) => {
  const { client, close } = await connect();
  t.after(close);
  const result = await client.callTool({ name: 'think_aloud', arguments: { thought: 'x'.repeat(401) } });
  assert.equal(result.isError, true);
});

const options = { direct: 'Direct flight, $640', redeye: 'Red-eye, $480' };

test('jev_decide is offered only when Jev is configured, and records the pick', async (t) => {
  const seen: unknown[] = [];
  const { show, client, close } = await connect(async (request) => { seen.push(request); return { choice: 'direct', confidence: 0.93, probabilities: { direct: 0.93, redeye: 0.07 } }; });
  t.after(close);
  assert.ok((await client.listTools()).tools.some((x) => x.name === 'jev_decide'));
  const reply = text(await client.callTool({ name: 'jev_decide', arguments: { question: 'Which flight?', options, context: 'No red-eyes.' } }));
  assert.equal(reply.choice, 'direct');
  assert.deepEqual(seen, [{ question: 'Which flight?', options, context: 'No red-eyes.' }]);
  assert.deepEqual(show.snapshot().events.at(-1)?.data, { kind: 'Jev', text: 'Direct flight, $640 (93%)' });
});

test('jev_decide tells the agent to decide alone when Jev fails', async (t) => {
  const { client, close } = await connect(async () => { throw new Error('timeout'); });
  t.after(close);
  const reply = text(await client.callTool({ name: 'jev_decide', arguments: { question: 'Which flight?', options, context: 'x' } }));
  assert.equal(reply.error, 'timeout');
  assert.match(reply.note, /Decide yourself/);
});

test('jev_decide rejects a single option', async (t) => {
  const { client, close } = await connect(async () => ({ choice: 'direct', confidence: 1, probabilities: {} }));
  t.after(close);
  const result = await client.callTool({ name: 'jev_decide', arguments: { question: 'Which?', options: { direct: 'x' }, context: 'x' } });
  assert.equal((result as { isError?: boolean }).isError, true);
});
