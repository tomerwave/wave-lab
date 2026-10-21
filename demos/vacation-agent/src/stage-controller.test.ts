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

test('an explicit retain or compare answer resolves the current flash-offer question without waiving cancellation', async () => {
  const { createStage, applyScenario, answerHuman } = await import('./stage-state.js');
  const { stageActions } = await import('./stage-controller.js');
  for (const choice of ['retain', 'compare']) {
    const state = createStage(); applyScenario(state, 'flash', 'great-offer');
    const page: StageObservation = { revision: state.revision, view: 'results', offers: offersFor(state) };
    assert.ok(stageActions(state, page, 4).some(a => a.id === 'ask:cancellation'));
    answerHuman(state, 'cancellation', { choice });
    assert.ok(!stageActions(state, page, 4).some(a => a.id === 'ask:cancellation'));
    assert.deepEqual(state.requirements.cancellation, { flight: true, hotel: true });
    assert.ok(stageActions(state, page, 4).some(a => a.id === 'inspect:white'));
  }
});

test('unchanged infeasible budget stays at the explanatory human gate without another model call', async () => {
  const c = new StageController(new TestBrowser(), async () => 'ask:budget');
  c.state.requirements.party.adults = 2; c.state.requirements.budgetNis = 2000;
  await c.start(); await c.pump();
  assert.match(c.question!.text, /2430/);
  assert.throws(() => c.answer(c.question!.id, { budgetNis: 2000 }), /2430/);
  assert.equal(c.status, 'question'); assert.equal(c.decisions, 1);
  c.answer(c.question!.id, { budgetNis: 3000 }); assert.equal(c.state.requirements.budgetNis, 3000); await c.stop();
});
test('completed unchanged inspections leave the registry and repetitive questions are bounded despite conversation revisions', async () => {
  const c = new StageController(new TestBrowser(), async d => d.actions.find(a => a.id === 'inspect:harbor') ? 'inspect:harbor' : 'ask:constraints');
  c.stage = 4; c.state.requirements.budgetNis = 1; await c.start(); await c.pump();
  assert.equal(c.status, 'question'); assert.equal(c.history.filter(h => h.action === 'inspect:harbor').length, 1);
  c.answer(c.question!.id, { text: 'המשך לבדוק' }); await c.pump();
  c.answer(c.question!.id, { text: 'המשך לבדוק' }); await c.pump();
  assert.equal(c.status, 'error'); assert.match(c.error!, /No progress/); await c.stop();
});
test('presentation delay is separately reported, adjustable, and emergency stop cancels before another model call', async () => {
  let calls = 0; const c = new StageController(new TestBrowser(), async () => { calls++; return 'inspect:harbor'; });
  c.setPacing(100); await c.start(); const running = c.pump(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(c.snapshot().presenting, true); assert.equal(c.snapshot().lastDecisionMs, undefined);
  await c.stop(); await running; assert.equal(calls, 0); assert.equal(c.status, 'stopped'); assert.throws(() => c.setPacing(10001));
});
test('traveler can retain an infeasible budget and pause for tradeoffs without any extra model request', async () => {
  const c = new StageController(new TestBrowser(), async () => 'ask:budget');
  c.state.requirements.party.adults = 2; c.state.requirements.budgetNis = 2000;
  await c.start(); await c.pump(); c.answer(c.question!.id, { choice: 'retain' }); await c.pump();
  assert.equal(c.status, 'paused'); assert.equal(c.state.requirements.budgetNis, 2000); assert.equal(c.decisions, 1);
  assert.deepEqual(c.state.requirements.cancellation, { flight: true, hotel: true }); await c.stop();
});
test('cancellation retain continues searching rather than taking the budget-only pause path', async () => {
  const c = new StageController(new TestBrowser(), async () => 'ask:cancellation');
  c.state.world.greatOffer = true; await c.start(); await c.pump(); c.answer(c.question!.id, { choice: 'retain' });
  assert.equal(c.status, 'running'); assert.equal(c.state.cancellationChoice, 'retain'); await c.stop();
});
test('an inspection discarded by pause during selection remains available on resume', async () => {
  let finish!: (id: string) => void; let calls = 0;
  const c = new StageController(new TestBrowser(), async d => { calls++; assert.ok(d.actions.some(a => a.id === 'inspect:harbor')); return calls === 1 ? new Promise(resolve => { finish = resolve; }) : 'inspect:harbor'; });
  await c.start(); const pending = c.pump(); await new Promise(resolve => setImmediate(resolve)); c.pause(); finish('inspect:harbor'); await pending;
  assert.deepEqual([c.status, c.history.length], ['paused', 0]); c.resume(); await c.pump(); assert.equal(c.status, 'checkpoint'); await c.stop();
});
test('runtime Normal cancels Very slow immediately without recreating the run', { timeout: 1000 }, async () => {
  const c = new StageController(new TestBrowser(), inspect); c.setPacing(5000); await c.start();
  const id = c.state.id; const pending = c.pump(); await new Promise(resolve => setImmediate(resolve)); c.setPacing(0); await pending;
  assert.equal(c.state.id, id); assert.equal(c.status, 'checkpoint'); assert.equal(c.snapshot().pacingMs, 0); await c.stop();
});
test('manual pause cancels presentation wait before model selection', { timeout: 1000 }, async () => {
  const c = new StageController(new TestBrowser(), inspect); c.setPacing(5000); await c.start();
  const pending = c.pump(); await new Promise(resolve => setImmediate(resolve)); c.pause(); await pending;
  assert.equal(c.status, 'paused'); assert.equal(c.decisions, 0); await c.stop();
});
test('known viable trip does not offer redundant budget/continuation questions; actual infeasibility retains human tradeoff choices', async () => {
  const { createStage } = await import('./stage-state.js'); const { stageActions } = await import('./stage-controller.js');
  const state = createStage(); const page: StageObservation = { revision: 0, view: 'results', offers: offersFor(state) };
  assert.ok(!stageActions(state, page, 0).some(a => ['ask:constraints', 'ask:budget'].includes(a.id)));
  state.requirements.budgetNis = 1; assert.ok(stageActions(state, page, 0).some(a => a.id === 'ask:constraints'));
});
test('after inspecting all offers a known viable hotel remains reachable from an incompatible flash offer', async () => {
  const choices = ['inspect:harbor', 'inspect:white', 'inspect:garden', 'inspect:flash', 'revisit:white', 'review:white'];
  const c = new StageController(new TestBrowser(), async d => { const id = choices.shift()!; assert.ok(d.actions.some(a => a.id === id), id); return id; });
  c.stage = 4; c.state.world.greatOffer = true; c.state.cancellationChoice = 'compare'; await c.start(); await c.pump();
  assert.equal(c.status, 'review'); assert.ok(c.history.some(h => h.action === 'revisit:white')); await c.stop();
});
