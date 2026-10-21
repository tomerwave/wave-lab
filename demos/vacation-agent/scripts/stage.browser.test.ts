import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { loadRunConfig } from '../src/config.js';
import { renderStageSite } from '../src/stage-site.js';
import { applyScenario, createStage, offersFor, offerProblems, type ScenarioEvent, type StageState } from '../src/stage-state.js';
import { createStageServer } from '../src/stage-server.js';
import { AgentCoreStageBrowser, type StageRemote } from '../src/stage-agentcore.js';
import { StageController, type StageDecision } from '../src/stage-controller.js';
let browser: Browser;
before(async () => { browser = await chromium.launch({ executablePath: loadRunConfig().executablePath }); });
after(async () => { await browser?.close(); });
async function sync(page: Page, s: StageState) { await page.evaluate(data => (window as any).__stageSync(data), { revision: s.revision, iran: s.world.iran, offers: offersFor(s) }); }
async function assertWorldChange(page: Page, s: StageState) {
  applyScenario(s, 'children', 'children'); applyScenario(s, 'world', 'iran'); applyScenario(s, 'offer', 'great-offer'); await sync(page, s);
  assert.ok(await page.locator('body').evaluate(el => el.classList.contains('iran')));
  assert.ok((await page.locator('body').innerText()).includes('איראן'));
}
async function assertFlash(page: Page) {
  await page.locator('#back').click(); await page.locator('[data-action="inspect:flash"]').click();
  assert.ok((await page.locator('.fine-print').innerText()).includes('NONREFUNDABLE'));
  assert.ok((await page.locator('.detail').innerText()).includes('1 תינוקות'));
  const observed = await page.evaluate(() => (window as any).__stageObserve()); assert.equal(observed.offers.at(-1).country, 'Iran');
  await page.locator('[data-action="review:flash"]').click(); assert.ok(await page.getByRole('button', { name: 'תשלום והזמנה אינם זמינים בדמו' }).isDisabled());
}
test('real local page shows changed data/colors, traveler counts, policy fine print and review without booking', async () => {
  const page = await browser.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await page.setContent(renderStageSite()); const s = createStage(); await sync(page, s);
    await page.locator('[data-action="inspect:harbor"]').click();
    assert.ok((await page.locator('.fine-print').innerText()).includes('Flight and hotel each allow cancellation'));
    await assertWorldChange(page, s); await assertFlash(page); assert.deepEqual(errors, []);
  } finally { await page.close(); }
});
async function assertDashboard(page: Page, url: string) {
  await page.goto(url); await page.getByText('LOCAL · תרגול ידני באתר מקומי.', { exact: false }).waitFor();
  assert.ok(await page.getByRole('button', { name: 'התחל תרגול מקומי ידני' }).isEnabled()); assert.ok(!await page.locator('#local-site').isVisible());
  const size = await page.locator('#viewport').boundingBox(); assert.deepEqual([size?.width, size?.height], [1440, 900]);
  await page.getByRole('button', { name: 'יומן / Replay' }).click(); assert.ok(await page.locator('#logs').isVisible());
  await page.getByRole('button', { name: 'חזרה לתצוגה' }).click(); assert.ok(!await page.locator('#logs').isVisible());
}
test('actual dashboard loads offline without JS errors, stays full viewport and never fakes a browser', async () => {
  const app = createStageServer({ liveEnabled: false, createRun() { throw new Error('Must never run'); } });
  await new Promise<void>(r => app.server.listen(0, '127.0.0.1', r)); const address = app.server.address(); assert.ok(address && typeof address !== 'string');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  try { await assertDashboard(page, `http://127.0.0.1:${address.port}`); assert.deepEqual(errors, []); }
  finally { await page.close(); await app.close(); }
});
function localRemote(page: Page): StageRemote {
  return { startSession: async () => 'local-test-only', generateLiveViewUrl: async () => 'local-test-only-no-stream',
    navigate: async p => { await page.goto(p.url); }, evaluate: async p => page.evaluate(p.script),
    click: async p => { await page.locator(p.selector).click({ timeout: p.timeout }); }, stopSession: async () => { await page.close(); },
  };
}
function testOnlySelector(d: StageDecision): Promise<string> {
  if (d.state.budgetPending) return Promise.resolve('ask:budget');
  if (d.state.destinationPending) return Promise.resolve('ask:destination');
  if (!d.state.world.greatOffer) return Promise.resolve(`inspect:${matchingOffer(d)}`);
  return flashDecision(d);
}
function matchingOffer(d: StageDecision): string {
  return d.page.offers.find(o => !offerProblems(o, d.state).length)?.id ?? d.page.offers.find(o => o.available && o.acceptsTraveler)!.id;
}
function flashDecision(d: StageDecision): Promise<string> {
  const text = d.state.conversation.at(-1)!.text;
  if (text.includes('השווה חלופות') || text.includes('שמור על ביטול')) return refundableDecision(d);
  if (d.page.selected !== 'flash') return Promise.resolve('inspect:flash');
  return Promise.resolve(d.state.requirements.cancellation.hotel ? 'ask:cancellation' : 'review:flash');
}
function refundableDecision(d: StageDecision): Promise<string> {
  const offer = matchingOffer(d);
  return Promise.resolve(d.page.selected === offer ? `review:${offer}` : `inspect:${offer}`);
}
async function joining(c: StageController, branch: 'girlfriend' | 'children') {
  await c.start(); await c.pump(); c.vote(c.checkpoint!.id, branch); await c.pump();
  assert.equal(c.question!.kind, 'budget'); c.answer(c.question!.id, { budgetNis: 6000 }); await c.pump();
}
async function finishStory(c: StageController, event: ScenarioEvent, cancellation: string) {
  const id = c.state.id; c.vote(c.checkpoint!.id, event); await c.pump();
  assert.equal(c.question!.kind, 'destination'); c.answer(c.question!.id, { choice: 'explore-fictional' }); await c.pump();
  assert.equal(c.question!.kind, 'cancellation'); c.answer(c.question!.id, { choice: cancellation }); await c.pump();
  assert.deepEqual([c.status, c.state.id], ['review', id]); assert.equal(c.state.events.length, 4);
}
const stories: { branch: 'girlfriend' | 'children'; event: ScenarioEvent; cancellation: string }[] = [
  { branch: 'girlfriend', event: 'halve-budget', cancellation: 'waive-both' },
  { branch: 'girlfriend', event: 'later', cancellation: 'retain' },
  { branch: 'girlfriend', event: 'clean-hotel', cancellation: 'compare' },
  { branch: 'children', event: 'halve-budget', cancellation: 'waive-both' },
  { branch: 'children', event: 'later', cancellation: 'retain' },
  { branch: 'children', event: 'hotel-refusal', cancellation: 'compare' },
];
for (const story of stories) {
  test(`controller plus real DOM: ${story.branch}/${story.event}/${story.cancellation} (test-only chooser, no AWS/Jev)`, async () => {
    const page = await browser.newPage(); const c = new StageController(new AgentCoreStageBrowser(localRemote(page)), testOnlySelector);
    try { await joining(c, story.branch); await finishStory(c, story.event, story.cancellation); assert.ok(await page.locator('#booking-review').isVisible()); }
    finally { await c.stop(); }
  });
}

async function localApp<T>(check: (page: Page) => Promise<T>): Promise<T> {
  const app = createStageServer({ liveEnabled: false, createRun() { throw new Error('Paid integrations must stay off'); } });
  await new Promise<void>(r => app.server.listen(0, '127.0.0.1', r)); const address = app.server.address(); assert.ok(address && typeof address !== 'string');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try { await page.goto(`http://127.0.0.1:${address.port}`); return await check(page); }
  finally { await page.close(); await app.close(); }
}
async function inspectLocal(page: Page, id: string, first = false) {
  const site = page.frameLocator('#local-site');
  if (!first) await site.locator('#back').click();
  await site.locator(`[data-action="inspect:${id}"]`).click();
}
async function localBeginning(page: Page, girlfriend: boolean) {
  await page.getByRole('button', { name: 'התחל תרגול מקומי ידני' }).click(); await inspectLocal(page, 'harbor', true);
  const label = girlfriend ? 'בת הזוג: מה זאת אומרת לבד? אני באה' : 'האח: הילדים רוצים לבוא — ילד ותינוק שצריך עריסה';
  await page.getByRole('button', { name: label }).click();
  await page.getByRole('spinbutton').fill('6000'); await page.getByRole('button', { name: 'אשר תקציב כולל ושלח לסוכן' }).click();
  await inspectLocal(page, 'harbor');
}
async function localSurprise(page: Page, girlfriend: boolean) {
  const label = girlfriend ? 'בת הזוג: רוצה מלון נקי ולבן; המלון הזה לא מתאים' : 'הבוס: החופשה עוברת שבוע קדימה';
  await page.getByRole('button', { name: label }).click(); await inspectLocal(page, 'white');
  await page.getByRole('button', { name: 'בחן את יעדי איראן בסיפור הבדיוני; שמור את כל התנאים' }).click(); await inspectLocal(page, 'white');
  await inspectLocal(page, 'flash');
}
async function localFinish(page: Page, retain: boolean) {
  const label = retain ? 'שמור על ביטול לשניהם וחפש חלופה' : 'מוותר במפורש על ביטול לטיסה ולמלון — לסיכום בלבד';
  await page.getByRole('button', { name: label }).click();
  if (retain) await inspectLocal(page, 'white');
  const site = page.frameLocator('#local-site'); await site.getByRole('button', { name: 'הצג סיכום לבדיקה' }).click();
  assert.ok(await site.getByRole('button', { name: 'תשלום והזמנה אינם זמינים בדמו' }).isDisabled());
  assert.ok((await page.locator('#badge').innerText()).includes('LOCAL / MANUAL / NO AI'));
}
for (const girlfriend of [false, true]) {
  test(`real local dashboard end to end, manual ${girlfriend ? 'girlfriend/clean/retain' : 'children/later/waive'} with zero provider calls`, async () => {
    const reviewed = await localApp(async page => { await localBeginning(page, girlfriend); await localSurprise(page, girlfriend); await localFinish(page, girlfriend); return page.frameLocator('#local-site').getByRole('button', { name: 'תשלום והזמנה אינם זמינים בדמו' }).isDisabled(); });
    assert.ok(reviewed);
  });
}

import { LocalAutonomousBrowser } from '../src/stage-local-browser.js';
test('production local autonomous browser adapter runs the real page with a test-only selector and no paid call', async () => {
  const local = new LocalAutonomousBrowser({ ...loadRunConfig(), headed: false }); const c = new StageController(local, testOnlySelector);
  try { await c.start(); await c.pump(); assert.deepEqual([c.status, (await local.observe()).selected], ['checkpoint', 'harbor']); }
  finally { await c.stop(); }
});
