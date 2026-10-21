import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../web/live-view.js', import.meta.url), 'utf8');
const { StageLiveView } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
function fixture() {
  let run = 'old', callbacks: any, observers: any, complete!: (c: unknown) => void, disconnected = false;
  const commands: string[] = [];
  const sdk = { authenticate(_url: string, c: unknown) { callbacks = c; }, async connect(c: any) { observers = c.observers; return new Promise(r => { complete = r; }); } };
  const view = new StageLiveView(sdk, { runId: () => run, url: async () => ({ signedUrl: 'https://example.invalid/?test=only' }), clear: () => undefined, resize: () => undefined, ready: (id: string) => commands.push(`ready:${id}`), failed: (id: string) => commands.push(`pause:${id}`) });
  return { view, commands, authenticate() { callbacks.success(null, [{ sessionId: 'test', authToken: 'test-only' }]); }, replace() { run = 'new'; view.disconnect(); observers.firstFrame(); callbacks.error(); }, finish() { complete({ disconnect() { disconnected = true; } }); }, disconnected: () => disconnected };
}
test('late DCV callbacks and connection from an old run cannot control a replacement run', async () => {
  const f = fixture(); await f.view.connect('old'); f.authenticate(); f.replace(); f.finish();
  await new Promise(r => setImmediate(r));
  assert.deepEqual(f.commands, []); assert.ok(f.disconnected()); f.view.disconnect();
});
