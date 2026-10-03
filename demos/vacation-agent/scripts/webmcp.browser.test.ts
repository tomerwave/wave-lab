import { loadRunConfig } from '../src/config.js';
import { writeLine } from '../src/output.js';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { chromium, type Browser } from 'playwright';
import { launchLocalBrowser } from '../src/local-browser.js';
import { createScenario } from '../src/hotels.js';
import { renderSite } from '../src/site.js';
import { findHotel, type StepEvent } from '../src/loop.js';
import { createCarelessChooser, createScriptedChooser } from '../src/scripted.js';
import { PresenterSession } from '../src/session.js';
import { invokeInPage } from '../src/webmcp.js';

const server = createServer((_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(renderSite(createScenario('happy').hotels)); });
let url: string;
let browser: Browser;
before(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  url = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ executablePath: loadRunConfig().executablePath, args: ['--enable-features=WebMCPTesting,ModelContext'] });
  writeLine(`Native browser: ${browser.version()}`);
});
after(async () => { await browser?.close(); server.close(); });

async function session() {
  return launchLocalBrowser({ executablePath: loadRunConfig().executablePath, headed: false, slowMoMs: 0, interaction: 'webmcp' });
}
function stopAtNoMatch(presenter: PresenterSession): void {
  if (presenter.currentPhase === 'no_match' && !presenter.isStopped) presenter.stop();
}
for (const name of ['happy', 'sold-out', 'budget-drop', 'careless'] as const) {
  test(`native WebMCP ${name} scenario`, async () => {
    const opened = await session();
    const scenario = createScenario(name === 'careless' ? 'sold-out' : name);
    const presenter = new PresenterSession(scenario, 'scripted / native WebMCP'); presenter.resume();
    const chooser = name === 'careless' ? createCarelessChooser() : createScriptedChooser();
    presenter.onChange = () => stopAtNoMatch(presenter);
    try {
      const outcome = await findHotel({ browser: opened, scenario, chooser, presenter, interaction: 'webmcp', siteUrl: url });
      assert.equal(outcome.status, name === 'budget-drop' ? 'stopped' : 'found');
      const expected = { happy: 'A', 'sold-out': 'C', careless: 'C', 'budget-drop': undefined };
      assert.equal(outcome.hotel?.id, expected[name]);
      assert.equal(outcome.hotel?.accessible, name === 'budget-drop' ? undefined : true);
    } finally { await opened.close(); }
  });
}

function recoveryDriver() {
  const scenario = createScenario('happy');
  const presenter = new PresenterSession(scenario, 'scripted / native WebMCP'); presenter.resume();
  let sold = false; let dropped = false; let restored = false;
  const events: StepEvent[] = []; const scripted = createScriptedChooser();
  const chooser = { async choose(request: Parameters<typeof scripted.choose>[0]) {
    const answer = await scripted.choose(request);
    if (answer.id === 'select_hotel' && !sold) { sold = true; presenter.queue({ kind: 'availability', hotelId: 'A', available: false }); }
    else if (answer.id === 'select_hotel' && !dropped) { dropped = true; presenter.queue({ kind: 'budget', value: 500 }); }
    return answer;
  } };
  presenter.onChange = () => {
    if (presenter.currentPhase !== 'no_match' || restored) return;
    restored = true; presenter.queue({ kind: 'availability', hotelId: 'A', available: true });
    presenter.queue({ kind: 'budget', value: 600 }); presenter.resume();
  };
  return { scenario, presenter, events, chooser, restored: () => restored };
}

test('native stale selection, budget no-match and recovery keep one run and browser', async () => {
  const opened = await session();
  const { scenario, presenter, events, chooser, restored } = recoveryDriver();
  try {
    const outcome = await findHotel({ browser: opened, scenario, chooser, presenter, interaction: 'webmcp', siteUrl: url, maxSteps: 20, onStep: event => events.push(event) });
    assert.equal(outcome.hotel?.id, 'A'); assert.ok(restored());
    assert.equal(events.filter(event => event.result.includes('world_changed')).length, 2);
    assert.deepEqual([...new Set(events.map(event => event.runId))], [presenter.id]);
  } finally { await opened.close(); }
});

async function invoke(page: Awaited<ReturnType<Browser['newPage']>>, name: string, input: Record<string, string>) {
  await page.evaluate(invokeInPage, { origin: new URL(url).origin, request: { name, input }, stringArguments: Number(browser.version().split('.')[0]) < 155 });
}
test('native tools reject wrong view/hotel/tool and malformed inputs; reload re-registers', async () => {
  const page = await browser.newPage(); await page.goto(url);
  try {
    await assert.rejects(invoke(page, 'select_hotel', { hotelId: 'A' }));
    await assert.rejects(invoke(page, 'open_hotel', { hotelId: 'Z' }));
    await assert.rejects(invoke(page, 'open_hotel', { hotelId: 'A', budget: '500' }));
    await invoke(page, 'open_hotel', { hotelId: 'A' });
    await assert.rejects(invoke(page, 'select_hotel', { hotelId: 'C' }));
    await invoke(page, 'back_to_results', {});
    await assert.rejects(invoke(page, 'back_to_results', {}));
    await page.reload();
    await invoke(page, 'open_hotel', { hotelId: 'C' });
    assert.equal(await page.locator('section:not([hidden])').getAttribute('data-view'), 'details-C');
  } finally { await page.close(); }
});
test('missing native API and removed tool fail explicitly without DOM fallback', async () => {
  const page = await browser.newPage(); await page.goto(url);
  try {
    await page.evaluate(() => Object.defineProperty(document, 'modelContext', { value: undefined, configurable: true }));
    await assert.rejects(invoke(page, 'open_hotel', { hotelId: 'A' }), /unavailable/);
    assert.equal(await page.locator('section:not([hidden])').getAttribute('data-view'), 'results');
    await page.reload();
    await page.evaluate(() => Object.defineProperty(document, 'modelContext', { value: { getTools: async () => [], executeTool: async () => { throw Error('must not execute'); } }, configurable: true }));
    await assert.rejects(invoke(page, 'open_hotel', { hotelId: 'A' }), /tool unavailable/);
  } finally { await page.close(); }
});
test('ordinary buttons use the shared transitions when native API is absent', async () => {
  const plain = await chromium.launch({ executablePath: loadRunConfig().executablePath }); const page = await plain.newPage();
  try {
    await page.goto(url); await page.click('[data-testid="open-hotel-A"]');
    await page.click('[data-testid="select-hotel"]:visible');
    assert.equal(await page.locator('section:not([hidden])').getAttribute('data-page'), 'checkout');
    assert.ok(await page.locator('[data-testid="pay"]:visible').isDisabled());
  } finally { await plain.close(); }
});

test('bridge rejects resolved failures and discovery timeout without changing the view', async () => {
  const page = await browser.newPage(); await page.goto(url);
  try {
    await page.evaluate(() => Object.defineProperty(document, 'modelContext', { value: { getTools: async () => [{ name: 'open_hotel', origin: location.origin, window }], executeTool: async () => ({ isError: true }) }, configurable: true }));
    await assert.rejects(invoke(page, 'open_hotel', { hotelId: 'A' }), /unsuccessful result/);
    await page.evaluate(() => Object.defineProperty(document, 'modelContext', { value: { getTools: () => new Promise(() => undefined), executeTool: async () => 'must not execute' }, configurable: true }));
    await assert.rejects(page.evaluate(invokeInPage, { origin: new URL(url).origin, request: { name: 'open_hotel', input: { hotelId: 'A' } }, stringArguments: true, timeoutMs: 20 }), /timeout/);
    assert.equal(await page.locator('section:not([hidden])').getAttribute('data-view'), 'results');
  } finally { await page.close(); }
});
test('bridge rejects a tool from another Window and forbidden tool', async () => {
  const page = await browser.newPage(); await page.goto(url);
  try {
    await assert.rejects(invoke(page, 'pay', {}), /Unsupported/);
    await page.evaluate(() => Object.defineProperty(document, 'modelContext', { value: { getTools: async () => [{ name: 'open_hotel', origin: location.origin, window: {} }], executeTool: async () => 'must not execute' }, configurable: true }));
    await assert.rejects(invoke(page, 'open_hotel', { hotelId: 'A' }), /tool unavailable/);
    assert.equal(await page.locator('section:not([hidden])').getAttribute('data-view'), 'results');
  } finally { await page.close(); }
});
async function freshRun(opened: Awaited<ReturnType<typeof session>>): Promise<string> {
  const scenario = createScenario('happy');
  const presenter = new PresenterSession(scenario, 'scripted / native WebMCP');
  presenter.queue({ kind: 'budget', value: 600 }); presenter.queue({ kind: 'budget', value: 600 });
  presenter.resume(); presenter.resume();
  const outcome = await findHotel({ browser: opened, scenario, presenter, chooser: createScriptedChooser(), interaction: 'webmcp', siteUrl: url });
  assert.equal(outcome.hotel?.id, 'A'); assert.equal(presenter.revision, 0);
  return presenter.id;
}
test('new sessions and repeated commands retain the browser and re-register native tools', async () => {
  const opened = await session();
  try {
    const first = await freshRun(opened); const second = await freshRun(opened);
    assert.notEqual(first, second);
  } finally { await opened.close(); }
});

test('pending execution receives an abort signal and times out', async () => {
  const page = await browser.newPage(); await page.goto(url);
  try {
    await page.evaluate(() => Object.defineProperty(document, 'modelContext', { value: {
      getTools: async () => [{ name: 'open_hotel', origin: location.origin, window }],
      executeTool: async (_tool: unknown, _input: unknown, { signal }: { signal: AbortSignal }) => new Promise(resolve => {
        signal.addEventListener('abort', () => { document.documentElement.dataset.toolAborted = 'true'; resolve('aborted'); });
      }),
    }, configurable: true }));
    await assert.rejects(page.evaluate(invokeInPage, { origin: new URL(url).origin, request: { name: 'open_hotel', input: { hotelId: 'A' } }, stringArguments: true, timeoutMs: 20 }), /timeout/);
    assert.equal(await page.locator('html').getAttribute('data-tool-aborted'), 'true');
    assert.equal(await page.locator('section:not([hidden])').getAttribute('data-view'), 'results');
  } finally { await page.close(); }
});
