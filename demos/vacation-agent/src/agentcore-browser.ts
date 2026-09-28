import { PlaywrightBrowser } from 'bedrock-agentcore/browser/playwright';
import { selectorFor, type BrowserSession } from './browser.js';

export type AgentCoreSession = BrowserSession & { start(): Promise<string> };

const TIMEOUT_MS = 15_000;

export function toDataUrl(html: string): string {
  return `data:text/html;charset=utf-8;base64,${Buffer.from(html, 'utf8').toString('base64')}`;
}

export function createAgentCoreBrowser(region: string): AgentCoreSession {
  const browser = new PlaywrightBrowser({ region });
  return {
    open: html => browser.navigate({ url: toDataUrl(html), timeout: TIMEOUT_MS }),
    click: testId => browser.click({ selector: selectorFor(testId), timeout: TIMEOUT_MS }),
    html: () => browser.getHtml(),
    close: () => browser.stopSession(),
    async start() {
      await browser.startSession();
      return browser.generateLiveViewUrl();
    },
  };
}
