import { chromium, type Browser, type Page } from 'playwright';
import { selectorFor, type BrowserSession } from './browser.js';

export type LocalBrowserOptions = { executablePath?: string; headed: boolean; slowMoMs: number };

const TIMEOUT_MS = 5_000;

export async function launchLocalBrowser(options: LocalBrowserOptions): Promise<BrowserSession> {
  const browser: Browser = await chromium.launch({
    executablePath: options.executablePath,
    headless: !options.headed,
    slowMo: options.slowMoMs,
  });
  const page: Page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT_MS);
  return {
    open: html => page.setContent(html),
    click: testId => page.click(selectorFor(testId)),
    html: () => page.content(),
    close: () => browser.close(),
  };
}
