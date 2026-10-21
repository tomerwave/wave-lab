import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StageController, type StageBrowser, type StageDecision, type StageObservation } from './stage-controller.js';
import { offersFor, type StageState } from './stage-state.js';
class TestBrowser implements StageBrowser {
  state!: StageState; view: 'results' | 'details' | 'review' = 'results'; selected?: string; closed = false; actions: string[] = [];
  async start() { return 'test-only-stream'; }
  async sync(state: StageState) { this.state = structuredClone(state); }
  async observe(): Promise<StageObservation> { return { revision: this.state.revision, view: this.view, selected: this.selected, offers: offersFor(this.state) }; }
  async act(id: string) { this.actions.push(id); this.selected = id.split(':')[1]; this.view = id.startsWith('review:') ? 'review' : 'details'; }
  async close() { this.closed = true; }
}
const inspect = async (d: StageDecision) => d.actions.find(x => x.id.startsWith('inspect:'))?.id ?? 'ask:budget';
test('completed inspection pauses at a semantic checkpoint and a repeated vote cannot apply twice', async () => {
  const browser = new TestBrowser(); const c = new StageController(browser, inspect);
  await c.start(); await c.pump();
  assert.deepEqual([c.status, browser.actions.length], ['checkpoint', 1]);
  const id = c.checkpoint!.id; c.vote(id, 'children'); c.vote(id, 'children');
  assert.deepEqual([c.state.events.length, c.state.requirements.budgetNis], [1, 3000]);
  await c.pump(); assert.deepEqual([c.status, c.checkpoint], ['question', undefined]);
  assert.throws(() => c.vote(id, 'girlfriend')); await c.stop(); assert.ok(browser.closed);
});
test('model selects a human question separately from presenter checkpoints and receives full history', async () => {
  const browser = new TestBrowser(); const seen: StageDecision[] = [];
  const c = new StageController(browser, async d => { seen.push(structuredClone(d)); return d.state.budgetPending ? 'ask:budget' : inspect(d); });
  await c.start(); await c.pump(); c.vote(c.checkpoint!.id, 'girlfriend'); await c.pump();
  assert.deepEqual([c.status, c.question!.kind, c.checkpoint], ['question', 'budget', undefined]); c.answer(c.question!.id, { budgetNis: 5000 }); await c.pump();
  assert.deepEqual([c.state.requirements.budgetNis, c.status], [5000, 'checkpoint']);
  assert.ok(seen.at(-1)!.history.some(x => x.action === 'inspect:harbor'));
  assert.ok(seen.at(-1)!.state.conversation.some(x => x.text.includes('5000'))); await c.stop();
});
test('stop during a pending model choice prevents late tool execution', async () => {
  let finish!: (id: string) => void; const browser = new TestBrowser();
  const c = new StageController(browser, async () => new Promise(resolve => { finish = resolve; }));
  await c.start(); const running = c.pump();
  await new Promise(resolve => setImmediate(resolve)); await c.stop(); finish('inspect:harbor'); await running;
  assert.equal(c.status, 'stopped'); assert.deepEqual(browser.actions, []); assert.ok(browser.closed);
});
test('unknown model action IDs fail closed without browser side effects', async () => {
  const browser = new TestBrowser(); const c = new StageController(browser, async () => 'pay');
  await c.start(); await c.pump(); assert.equal(c.status, 'error'); assert.deepEqual(browser.actions, []); await c.stop();
});
test('review rechecks current policy and the great offer never bypasses cancellation', async () => {
  const browser = new TestBrowser(); const c = new StageController(browser, async d => {
    if (d.state.budgetPending) return 'ask:budget'; if (d.state.destinationPending) return 'ask:destination';
    return d.state.world.greatOffer ? 'review:flash' : inspect(d);
  });
  await firstVote(c); c.answer(c.question!.id, { budgetNis: 5000 });
  await c.pump(); c.vote(c.checkpoint!.id, 'later'); await c.pump(); c.answer(c.question!.id, { choice: 'explore-fictional' });
  await c.pump(); assert.equal(c.status, 'error'); assert.ok(!browser.actions.includes('review:flash')); await c.stop();
});

async function firstVote(c: StageController) { await c.start(); await c.pump(); c.vote(c.checkpoint!.id, 'girlfriend'); await c.pump(); }

test('manual pause lets the in-flight tool finish and prevents another action', async () => {
  const browser = new TestBrowser(); let finish!: () => void;
  browser.act = async id => { browser.actions.push(id); await new Promise<void>(r => { finish = r; }); };
  const c = new StageController(browser, inspect); c.stage = 4; await c.start(); const running = c.pump();
  await new Promise(r => setImmediate(r)); c.pause(); finish(); await running;
  assert.deepEqual([c.status, browser.actions.length], ['paused', 1]); await c.stop();
});
