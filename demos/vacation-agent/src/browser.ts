import { parsePageState, type PageState } from './page-state.js';
import type { Hotel } from './hotels.js';

export interface BrowserSession {
  open(html: string): Promise<void>;
  openUrl?(url: string): Promise<void>;
  click(testId: string): Promise<void>;
  html(): Promise<string>;
  close(): Promise<void>;
  syncWorld?(hotels: readonly Hotel[]): Promise<void>;
}

export async function readState(browser: BrowserSession): Promise<PageState> {
  return parsePageState(await browser.html());
}

export function selectorFor(testId: string): string {
  return `[data-testid="${testId}"]:visible`;
}
