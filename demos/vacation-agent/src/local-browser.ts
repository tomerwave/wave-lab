import { fixtureOrigin, invokeInPage, toolRequest, type Interaction } from './webmcp.js';
import { syncWorldInPage } from './sync-world.js';
import { chromium, type Browser, type Page } from 'playwright';
import { selectorFor, type BrowserSession } from './browser.js';

export type LocalBrowserOptions = { executablePath?: string; headed: boolean; slowMoMs: number; interaction?: Interaction };

const TIMEOUT_MS = 5_000;

export async function launchLocalBrowser(options: LocalBrowserOptions): Promise<BrowserSession> {
  const browser: Browser = await chromium.launch({
    executablePath: options.executablePath,
    headless: !options.headed,
    slowMo: options.slowMoMs,
    args: options.interaction === 'webmcp' ? ['--enable-features=WebMCPTesting,ModelContext'] : [],
    handleSIGINT: false,
    handleSIGTERM: false,
  });
  const page: Page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT_MS);
  const stringArguments = Number(browser.version().split('.')[0]) < 155;
  return {
    open: html => page.setContent(html),
    openUrl: async url => { await page.goto(url, { waitUntil: 'load', timeout: 30_000 }); },
    invokeTool: async (id, hotelId) => { await page.evaluate(invokeInPage, { origin: fixtureOrigin(page.url()), request: toolRequest(id, hotelId), stringArguments }); },
    click: testId => page.click(selectorFor(testId)),
    syncWorld: hotels => page.evaluate(syncWorldInPage, [...hotels]),
    html: () => page.content(),
    close: () => browser.close(),
  };
}
