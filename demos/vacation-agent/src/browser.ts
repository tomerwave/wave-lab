import { parsePageState, type PageState } from './page-state.js';

export interface BrowserSession {
  open(html: string): Promise<void>;
  click(testId: string): Promise<void>;
  html(): Promise<string>;
  close(): Promise<void>;
}

export async function readState(browser: BrowserSession): Promise<PageState> {
  return parsePageState(await browser.html());
}

export function selectorFor(testId: string): string {
  return `[data-testid="${testId}"]:visible`;
}
