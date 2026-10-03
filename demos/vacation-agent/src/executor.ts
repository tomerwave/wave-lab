import { readState, type BrowserSession } from './browser.js';
import type { PageState } from './page-state.js';
import type { Registry } from './registry.js';

export type StepResult =
  | { kind: 'done'; state: PageState }
  | { kind: 'replan'; reason: string; state: PageState };

export type ExecutionContext = { registry: Registry; browser: BrowserSession; validate?: (state: PageState) => PageState; cancelled?: () => boolean };

export async function executeChoice(id: string, { registry, browser, validate, cancelled }: ExecutionContext): Promise<StepResult> {
  const action = registry.get(id);
  if (!action) return { kind: 'replan', reason: 'unknown_action', state: await readState(browser) };

  const read = await readState(browser);
  const fresh = validate ? validate(read) : read;
  if (cancelled?.()) return { kind: 'replan', reason: 'stopped', state: fresh };
  const verdict = action.allowed(fresh);
  if (!verdict.ok) return { kind: 'replan', reason: verdict.reason, state: fresh };

  await action.run(browser, fresh);
  return { kind: 'done', state: await readState(browser) };
}
