import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Show } from './show/engine.js';
import { createShowServer } from './server.js';

async function connect() {
  const show = new Show({ sleep: () => Promise.resolve() });
  show.prefillMission('Tokyo', null);
  const server = createShowServer(show, { port: 0, publicUrl: 'http://localhost', presenterKey: 'k' });
  await new Promise<void>((r) => server.listen(0, r));
  const url = new URL(`http://localhost:${(server.address() as AddressInfo).port}/mcp/k`);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(url));
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
