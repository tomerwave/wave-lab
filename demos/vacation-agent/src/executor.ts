import { readState, type BrowserSession } from './browser.js';
import type { PageState } from './page-state.js';
import type { Registry } from './registry.js';

export type StepResult =
  | { kind: 'done'; state: PageState }
  | { kind: 'replan'; reason: string; state: PageState };

export type ExecutionContext = { registry: Registry; browser: BrowserSession };

export async function executeChoice(id: string, { registry, browser }: ExecutionContext): Promise<StepResult> {
  const action = registry.get(id);
  if (!action) return { kind: 'replan', reason: 'unknown_action', state: await readState(browser) };

  const fresh = await readState(browser);
  const verdict = action.allowed(fresh);
  if (!verdict.ok) return { kind: 'replan', reason: verdict.reason, state: fresh };

  await action.run(browser);
  return { kind: 'done', state: await readState(browser) };
}
