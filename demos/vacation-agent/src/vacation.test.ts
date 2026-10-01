import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { availableActions } from './actions.js';
import { toDataUrl } from './agentcore-browser.js';
import type { BrowserSession } from './browser.js';
import type { Chooser } from './chooser.js';
import { compactState } from './compact.js';
import { executeChoice } from './executor.js';
import { createScenario, type Hotel } from './hotels.js';
import { createJevChooser } from './jev.js';
import { findHotel } from './loop.js';
import { parsePageState } from './page-state.js';
import { createPlanner, FIND_HOTEL_TOOL, onlyOnce } from './planner.js';
import { createRegistry } from './registry.js';
import { createCarelessChooser, createScriptedChooser } from './scripted.js';
import { renderSite } from './site.js';
import { PresenterSession } from './session.js';
import { formatStep } from './trace.js';

const SECTION_TAG = /<section data-view="([^"]+)" data-page="([^"]+)"( hidden)?>/g;

class FakeBrowser implements BrowserSession {
  document = '';
  clicks: string[] = [];
  closed = false;

  async open(html: string) {
    this.document = html;
  }

  async click(testId: string) {
    const state = parsePageState(this.document);
    if (!state.enabledButtons.includes(testId)) throw new Error(`not clickable: ${testId}`);
    const visible = [...this.document.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map(match => match[0]).find(block => !/^<section[^>]*hidden/.test(block)) ?? '';
    const target = new RegExp(`data-testid="${testId}"[^>]*data-show="([^"]+)"|data-show="([^"]+)"[^>]*data-testid="${testId}"`).exec(visible);
    const view = target?.[1] ?? target?.[2];
    this.clicks.push(testId);
    this.document = this.document.replace(SECTION_TAG, (_tag, name: string, page: string) =>
      `<section data-view="${name}" data-page="${page}"${name === view ? '' : ' hidden'}>`);
  }

  async html() {
    return this.document;
  }

  async syncWorld(hotels: readonly Hotel[]) {
    for (const hotel of hotels) {
      this.document = this.document.replace(/<h1\b[^>]*>/g, tag => tag.includes(`data-hotel="${hotel.id}"`) ? tag.replace(/data-available="[^"]*"/, `data-available="${hotel.available}"`) : tag);
      this.document = this.document.replace(/<button\b[^>]*>/g, tag => {
        if (!tag.includes('data-testid="select-hotel"') || !tag.includes(`data-hotel="${hotel.id}"`)) return tag;
        const enabled = tag.replace(' disabled', '');
        return hotel.available ? enabled : enabled.replace('>', ' disabled>');
      });
    }
  }

  async close() {
    this.closed = true;
  }
}

async function openAt(scenarioName: Parameters<typeof createScenario>[0], clicks: string[] = []) {
  const scenario = createScenario(scenarioName);
  const browser = new FakeBrowser();
  await browser.open(renderSite(scenario.hotels));
  for (const testId of clicks) await browser.click(testId);
  browser.clicks = [];
  return { scenario, browser, registry: createRegistry(scenario.goal) };
}

test('the results page lists three hotels and offers only actions the page allows', async () => {
  const { browser } = await openAt('sold-out');
  const state = parsePageState(await browser.html());
  assert.equal(state.page, 'results');
  assert.deepEqual(state.listed.map(hotel => [hotel.id, hotel.totalEur, hotel.accessible]), [['A', 520, true], ['B', 480, false], ['C', 590, true]]);
  assert.deepEqual(availableActions(state).map(option => option.id), ['open_hotel_A', 'open_hotel_B', 'open_hotel_C', 'stop']);
});

test('a sold out hotel is compacted as sold_out and cannot be selected', async () => {
  const { scenario, browser } = await openAt('sold-out', ['open-hotel-A']);
  const state = parsePageState(await browser.html());
  assert.equal(compactState(state, scenario.goal, { ruledOut: { A: 'sold_out' } }).hotel_A, 'sold_out');
  assert.deepEqual(availableActions(state).map(option => option.id), ['back_to_results', 'stop']);
});

test('a valid choice that breaks a condition is rejected by code without a click', async () => {
  const { browser, registry } = await openAt('happy', ['open-hotel-B']);
  const result = await executeChoice('select_hotel', { registry, browser });
  assert.equal(result.kind, 'replan');
  assert.equal(result.kind === 'replan' && result.reason, 'not_accessible');
  assert.deepEqual(browser.clicks, []);
});

test('the executor reads fresh state, so a hotel that sold out after the choice is never selected', async () => {
  const { browser, registry } = await openAt('happy', ['open-hotel-A']);
  const soldOutMeanwhile = await openAt('sold-out', ['open-hotel-A']);
  browser.document = soldOutMeanwhile.browser.document;
  const result = await executeChoice('select_hotel', { registry, browser });
  assert.equal(result.kind === 'replan' && result.reason, 'not_available_now');
  assert.deepEqual(browser.clicks, []);
});

test('an unknown id or a hidden pay button can never be clicked', async () => {
  const { browser, registry } = await openAt('happy', ['open-hotel-A']);
  for (const id of ['pay', 'pay_now', 'open_hotel_A; pay']) {
    const result = await executeChoice(id, { registry, browser });
    assert.equal(result.kind === 'replan' && result.reason, 'unknown_action', id);
  }
  assert.deepEqual(browser.clicks, []);
});

test('a missing or malformed price counts as a violation, not as within budget', () => {
  const goal = createScenario('happy').goal;
  for (const price of ['', '1,200', 'free']) {
    const html = renderSite(createScenario('happy').hotels).replace('data-view="details-A" data-page="hotel_details" hidden', 'data-view="details-A" data-page="hotel_details"').replace('data-view="results" data-page="results"', 'data-view="results" data-page="results" hidden').replace(/(data-testid="hotel-details" data-hotel="A" data-total-eur=")520/, `$1${price}`);
    const state = parsePageState(html);
    assert.equal(state.page, 'hotel_details', price);
    const verdict = createRegistry(goal).get('select_hotel')?.allowed(state);
    assert.deepEqual(verdict, { ok: false, reason: 'unknown_price' }, price);
  }
});

test('scripted runs match the three stage scenarios and never reach payment', async () => {
  const expectations = [['happy', 'found', 'A'], ['sold-out', 'found', 'C'], ['budget-drop', 'no_match', undefined]] as const;
  for (const [name, status, hotel] of expectations) {
    const browser = new FakeBrowser();
    const outcome = await findHotel({ browser, chooser: createScriptedChooser(), scenario: createScenario(name) });
    assert.equal(outcome.status, status, name);
    assert.equal(outcome.hotel?.id, hotel, name);
    assert.ok(!browser.clicks.includes('pay'), name);
  }
});

test('the sold-out run clicks exactly the path shown on the slides', async () => {
  const browser = new FakeBrowser();
  await findHotel({ browser, chooser: createScriptedChooser(), scenario: createScenario('sold-out') });
  assert.deepEqual(browser.clicks, ['open-hotel-A', 'back-to-results', 'open-hotel-C', 'select-hotel']);
});

test('a careless chooser is corrected by code and still ends at hotel C', async () => {
  const results: string[] = [];
  const outcome = await findHotel({
    browser: new FakeBrowser(),
    chooser: createCarelessChooser(),
    scenario: createScenario('sold-out'),
    maxSteps: 10,
    onStep: event => results.push(event.result),
  });
  assert.equal(outcome.hotel?.id, 'C');
  assert.ok(results.includes('rejected by code: not_accessible'));
});

test('a step limit stops a loop that makes no progress', async () => {
  const pingPong: Chooser = {
    choose: async ({ page }) => ({ id: page.page === 'results' ? 'open_hotel_A' : 'back_to_results', source: 'scripted' }),
  };
  const outcome = await findHotel({ browser: new FakeBrowser(), chooser: pingPong, scenario: createScenario('sold-out'), maxSteps: 4 });
  assert.deepEqual(outcome, { status: 'step_limit', steps: 4 });
});

test('the Jev chooser sends the page state and the offered action ids, and returns the choice', async () => {
  const sent: unknown[] = [];
  const client = new TypeSafeClient({
    apiKey: 'test-key',
    retry: { maxRetries: 0 },
    fetch: async (_url, init) => {
      sent.push(JSON.parse(String(init?.body)));
      const answers = { nextAction: { type: 'choice', choice: 'back_to_results', confidence: 0.82, probabilities: { back_to_results: 0.91, stop: 0.09 } } };
      return new Response(JSON.stringify({ model: 'jev-test', answers, usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const { scenario, browser } = await openAt('sold-out', ['open-hotel-A']);
  const page = parsePageState(await browser.html());
  const memory = { ruledOut: { A: 'sold_out' } };
  const state = compactState(page, scenario.goal, memory);
  const choice = await createJevChooser(client).choose({ state, options: availableActions(page), page, goal: scenario.goal, memory });
  assert.deepEqual(choice, { id: 'back_to_results', confidence: 0.82, source: 'jev' });
  const body = sent[0] as { state: { hotel_A: string }; questions: { nextAction: { criteria: Record<string, string> } } };
  assert.equal(body.state.hotel_A, 'sold_out');
  assert.deepEqual(Object.keys(body.questions.nextAction.criteria), ['back_to_results', 'stop']);
});

test('the Strands planner is built with a single find_hotel tool', () => {
  const planner = createPlanner({
    region: 'us-east-1',
    modelId: 'test-model',
    goal: createScenario('budget-drop').goal,
    findHotel: async () => ({ status: 'stopped', steps: 1 }),
  });
  assert.deepEqual(planner.tools.map(item => item.name), [FIND_HOTEL_TOOL]);
});

test('the AgentCore data URL carries the same page the local browser opens', () => {
  const html = renderSite(createScenario('happy').hotels);
  const encoded = toDataUrl(html).split('base64,')[1];
  assert.equal(Buffer.from(encoded, 'base64').toString('utf8'), html);
});

test('the planner tool runs the search once, even if the model calls it again', async () => {
  let searches = 0;
  const search = onlyOnce(async () => {
    searches += 1;
    return { status: 'no_match', steps: 1 };
  });
  assert.deepEqual(JSON.parse(await search()), { status: 'no_match', steps: 1 });
  assert.match(await search(), /already ran/);
  assert.equal(searches, 1);
});

test('after a rejection, the next state tells the chooser what was rejected and what is ruled out', async () => {
  const states: Record<string, unknown>[] = [];
  const careless = createCarelessChooser();
  const recorder: Chooser = { choose: async request => {
    states.push(request.state);
    return careless.choose(request);
  } };
  await findHotel({ browser: new FakeBrowser(), chooser: recorder, scenario: createScenario('sold-out'), maxSteps: 3 });
  assert.equal(states[2].last_result, 'rejected select_hotel: not_accessible');
  assert.deepEqual(states[2].ruled_out, { B: 'not_accessible' });
});

test('registry reads the latest budget immediately before selecting', async () => {
  const { scenario, browser } = await openAt('happy', ['open-hotel-A']);
  let budget = scenario.goal.budgetEur;
  const registry = createRegistry(() => ({ ...scenario.goal, budgetEur: budget }));
  budget = 500;
  const result = await executeChoice('select_hotel', { registry, browser });
  assert.equal(result.kind === 'replan' && result.reason, 'over_budget');
  assert.deepEqual(browser.clicks, []);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

for (const intervention of [
  { kind: 'availability', hotelId: 'A', available: false },
  { kind: 'budget', value: 500 },
] as const) {
  test(`queued ${intervention.kind} during a choice blocks the stale select before clicking`, async () => {
    const browser = new FakeBrowser();
    const presenter = new PresenterSession(createScenario('happy'), 'test scripted');
    presenter.resume();
    const pending = deferred<Awaited<ReturnType<Chooser['choose']>>>();
    const entered = deferred<void>();
    const chooser: Chooser = { choose: async request => {
      if (request.page.page === 'results') return { id: 'open_hotel_A', source: 'scripted' };
      entered.resolve();
      return pending.promise;
    } };
    const result = findHotel({ browser, chooser, scenario: createScenario('happy'), presenter, maxSteps: 2 });
    await entered.promise;
    presenter.queue(intervention);
    pending.resolve({ id: 'select_hotel', source: 'scripted' });
    assert.equal((await result).status, 'step_limit');
    assert.deepEqual(browser.clicks, ['open-hotel-A']);
    assert.equal(presenter.revision, 1);
  });
}

test('no-match recovers after restoring budget within the same browser and run', async () => {
  const browser = new FakeBrowser();
  const scenario = createScenario('budget-drop');
  const presenter = new PresenterSession(scenario, 'test scripted');
  const runId = presenter.id;
  presenter.onChange = () => {
    if (presenter.status !== 'no_match') return;
    presenter.onChange = undefined;
    presenter.queue({ kind: 'budget', value: 600 });
    presenter.resume();
  };
  presenter.resume();
  const outcome = await findHotel({ browser, scenario, presenter, chooser: createScriptedChooser() });
  assert.equal(outcome.hotel?.id, 'A');
  assert.equal(presenter.id, runId);
  assert.equal(presenter.revision, 1);
  assert.deepEqual(browser.clicks, ['open-hotel-A', 'select-hotel']);
});

test('relaxed availability clears earlier exclusions and can choose A again', async () => {
  const browser = new FakeBrowser();
  const scenario = createScenario('sold-out');
  const presenter = new PresenterSession(scenario, 'test scripted');
  presenter.resume();
  let choices = 0;
  const chooser: Chooser = { choose: async request => {
    choices += 1;
    if (choices === 1) return { id: 'open_hotel_A', source: 'scripted' };
    if (choices === 3) presenter.queue({ kind: 'availability', hotelId: 'A', available: true });
    return createScriptedChooser().choose(request);
  } };
  const outcome = await findHotel({ browser, scenario, presenter, chooser });
  assert.equal(outcome.hotel?.id, 'A');
  assert.ok(browser.clicks.includes('back-to-results'));
});

test('Stop interrupts a pending chooser and a late answer cannot click', async () => {
  const browser = new FakeBrowser();
  const presenter = new PresenterSession(createScenario('happy'), 'test scripted');
  presenter.resume();
  const entered = deferred<void>();
  const pending = deferred<Awaited<ReturnType<Chooser['choose']>>>();
  const chooser: Chooser = { choose: async () => { entered.resolve(); return pending.promise; } };
  const run = findHotel({ browser, presenter, scenario: createScenario('happy'), chooser });
  await entered.promise;
  presenter.stop();
  assert.equal((await run).status, 'stopped');
  pending.resolve({ id: 'open_hotel_A', source: 'scripted' });
  await Promise.resolve();
  assert.deepEqual(browser.clicks, []);
});

test('a chooser timeout terminates without any clicks', async () => {
  const browser = new FakeBrowser();
  const chooser: Chooser = { choose: () => new Promise(() => undefined) };
  const outcome = await findHotel({ browser, scenario: createScenario('happy'), chooser, choiceTimeoutMs: 5 });
  assert.equal(outcome.status, 'timeout');
  assert.deepEqual(browser.clicks, []);
});

test('Next and repeated world commands keep one checkpoint and revision', async () => {
  const presenter = new PresenterSession(createScenario('happy'), 'test scripted');
  presenter.queue({ kind: 'budget', value: 500 });
  presenter.queue({ kind: 'budget', value: 500 });
  presenter.next();
  await presenter.checkpoint('before_choice');
  assert.equal(presenter.revision, 1);
  let released = false;
  const wait = presenter.checkpoint('before_click').then(() => { released = true; });
  await Promise.resolve();
  assert.equal(released, false);
  presenter.stop();
  await wait;
  assert.equal(released, true);
});

test('Stop during an asynchronous checkout read wins over a found outcome', async () => {
  const browser = new FakeBrowser();
  const scenario = createScenario('happy');
  const presenter = new PresenterSession(scenario, 'test scripted');
  const entered = deferred<void>();
  const release = deferred<void>();
  const html = browser.html.bind(browser);
  let checkoutReads = 0;
  browser.html = async () => {
    const document = await html();
    if (parsePageState(document).page === 'checkout' && ++checkoutReads === 2) {
      entered.resolve();
      await release.promise;
    }
    return document;
  };
  presenter.resume();
  const run = findHotel({ browser, scenario, presenter, chooser: createScriptedChooser() });
  await entered.promise;
  presenter.stop();
  release.resolve();
  assert.equal((await run).status, 'stopped');
});

test('a failed live choice is logged as interrupted without inventing a scripted decision', async () => {
  const traces: string[] = [];
  const chooser: Chooser = { choose: async () => { throw new Error('HTTP 500'); } };
  await assert.rejects(findHotel({ browser: new FakeBrowser(), scenario: createScenario('happy'), chooser,
    onStep: event => traces.push(...formatStep(event)),
  }), /HTTP 500/);
  assert.ok(traces.includes('choice: none (decision interrupted)'));
  assert.ok(!traces.some(line => line.includes('stop (scripted)')));
});

test('a supplied website URL is opened instead of silently substituting local HTML', async () => {
  const browser = new FakeBrowser();
  const opened: string[] = [];
  const openUrl = async (url: string) => {
    opened.push(url);
    await browser.open(renderSite(createScenario('happy').hotels));
  };
  const outcome = await findHotel({ browser: Object.assign(browser, { openUrl }), scenario: createScenario('happy'), chooser: createScriptedChooser(), siteUrl: 'https://fictional.example' });
  assert.equal(outcome.status, 'found');
  assert.deepEqual(opened, ['https://fictional.example']);
});

test('a browser without URL support fails explicitly rather than replacing the requested site', async () => {
  await assert.rejects(findHotel({ browser: new FakeBrowser(), scenario: createScenario('happy'), chooser: createScriptedChooser(), siteUrl: 'https://fictional.example' }), /cannot open a site URL/);
});
