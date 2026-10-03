import type { Interaction } from './webmcp.js';
import { availableActions } from './actions.js';
import { readState, type BrowserSession } from './browser.js';
import type { Choice, Chooser } from './chooser.js';
import { compactState, type CompactState, type Memory } from './compact.js';
import { executeChoice } from './executor.js';
import type { Goal, Scenario } from './hotels.js';
import type { PageState } from './page-state.js';
import { meetsConditions, violations, type HotelFacts } from './policy.js';
import { createRegistry, type Registry } from './registry.js';
import type { PresenterSession } from './session.js';
import { renderSite } from './site.js';

export const DEFAULT_MAX_STEPS = 10;
export type Outcome = { status: 'found' | 'no_match' | 'stopped' | 'step_limit' | 'timeout'; steps: number; hotel?: HotelFacts };
export type StepEvent = { step: number; state: CompactState; choice: Choice; result: string; interrupted?: boolean; runId?: string; mode?: string; revision?: number; decisionRevision?: number };
export type LoopDeps = {
  browser: BrowserSession; chooser: Chooser; scenario: Scenario; maxSteps?: number;
  presenter?: PresenterSession; choiceTimeoutMs?: number;
  siteUrl?: string; interaction?: Interaction;
  onStep?: (event: StepEvent) => void;
};
type Run = { deps: LoopDeps; registry: Registry; memory: Memory; listed: HotelFacts[]; revision: number };

function goal(run: Run): Goal { return run.deps.presenter?.goal() ?? run.deps.scenario.goal; }
function authoritative(page: PageState, run: Run): PageState {
  const world = run.deps.presenter?.snapshot();
  if (!world) return page;
  const facts = (hotel: HotelFacts) => ({ ...hotel, available: world.hotels.find(item => item.id === hotel.id)?.available ?? false });
  return { ...page, listed: page.listed.map(facts), hotel: page.hotel ? facts(page.hotel) : undefined };
}
async function observe(run: Run): Promise<PageState> {
  const presenter = run.deps.presenter;
  if (presenter && run.revision !== presenter.revision) {
    run.memory.ruledOut = {};
    run.revision = presenter.revision;
    await run.deps.browser.syncWorld?.(presenter.snapshot().hotels);
  }
  const page = authoritative(await readState(run.deps.browser), run);
  if (page.page === 'results') run.listed = page.listed;
  if (page.hotel) {
    const found = violations(page.hotel, goal(run));
    if (found.length) run.memory.ruledOut[page.hotel.id] = found.join(',');
  }
  return page;
}
function stopStatus(run: Run): Outcome['status'] {
  const world = run.deps.presenter?.snapshot();
  const listed = world?.hotels ?? run.listed;
  return listed.some(hotel => !(hotel.id in run.memory.ruledOut) && meetsConditions(hotel, goal(run))) ? 'stopped' : 'no_match';
}
async function choose(run: Run, page: PageState, state: CompactState): Promise<Choice> {
  const signal = run.deps.presenter?.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const interrupted = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('choice_timeout')), run.deps.choiceTimeoutMs ?? 30_000);
    cancel = () => reject(new Error('stopped'));
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
  });
  try {
    return await Promise.race([run.deps.chooser.choose({ state, options: availableActions(page), page, goal: goal(run), memory: run.memory }), interrupted]);
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
  }
}
function report(run: Run, event: StepEvent): void {
  const presenter = run.deps.presenter;
  run.deps.onStep?.({ ...event, runId: presenter?.id, mode: presenter?.mode, revision: presenter?.revision });
}
async function stopChoice(run: Run): Promise<'continue' | 'stop'> {
  const presenter = run.deps.presenter;
  if (!presenter || stopStatus(run) !== 'no_match') return 'stop';
  await presenter.checkpoint('no_match');
  return presenter.isStopped ? 'stop' : 'continue';
}
async function executeTurn(run: Run, choice: Choice): Promise<string> {
  const result = await executeChoice(choice.id, { registry: run.registry, browser: run.deps.browser,
    validate: fresh => authoritative(fresh, run), cancelled: () => run.deps.presenter?.isStopped ?? false });
  run.memory.lastRejection = result.kind === 'replan' ? `rejected ${choice.id}: ${result.reason}` : undefined;
  return result.kind === 'done' ? 'ok' : `rejected by code: ${result.reason}`;
}
function interruptionResult(result: string): string { return result === 'stopped' ? 'choice_cancelled' : result; }
async function pendingChoice(step: number, page: PageState, run: Run, state: CompactState): Promise<Choice | 'stop' | 'timeout'> {
  try { return await choose(run, page, state); }
  catch (error) {
    const result = error instanceof Error ? error.message : 'chooser_failed';
    report(run, { step, state, choice: { id: 'stop', source: 'scripted' }, result: interruptionResult(result), interrupted: true });
    if (result === 'stopped') return 'stop';
    if (result === 'choice_timeout') return 'timeout';
    throw error;
  }
}
async function freshDecision(run: Run, choice: Choice, decisionRevision?: number): Promise<'stopped' | 'world_changed' | 'ready'> {
  const presenter = run.deps.presenter;
  await presenter?.checkpoint('before_click', choice.id);
  await observe(run);
  if (presenter?.isStopped) return 'stopped';
  if (presenter && presenter.revision !== decisionRevision) {
    run.memory.lastRejection = `rejected ${choice.id}: world_changed`;
    return 'world_changed';
  }
  return 'ready';
}
async function turn(step: number, page: PageState, run: Run): Promise<'continue' | 'stop' | 'timeout'> {
  const decisionRevision = run.deps.presenter?.revision;
  const state = compactState(page, goal(run), run.memory);
  const choice = await pendingChoice(step, page, run, state);
  if (typeof choice === 'string') return choice;
  const fresh = await freshDecision(run, choice, decisionRevision);
  if (fresh === 'stopped') return 'stop';
  if (fresh === 'world_changed') {
    report(run, { step, state, choice, result: 'rejected by code: world_changed', decisionRevision });
    return 'continue';
  }
  return completeTurn(run, { step, state, choice, result: '', decisionRevision });
}
async function completeTurn(run: Run, event: StepEvent): Promise<'continue' | 'stop'> {
  event.result = event.choice.id === 'stop' ? 'stopped' : await executeTurn(run, event.choice);
  report(run, event);
  return event.choice.id === 'stop' ? stopChoice(run) : 'continue';
}
async function searchStep(run: Run, step: number): Promise<Outcome | undefined> {
  await run.deps.presenter?.checkpoint('before_choice');
  const page = await observe(run);
  if (run.deps.presenter?.isStopped) return { status: 'stopped', steps: step - 1 };
  if (page.page === 'checkout') return checkCheckout(run, page, step - 1);
  const result = await turn(step, page, run);
  if (result === 'stop') return stoppedOutcome(run, step);
  if (result === 'timeout') return { status: 'timeout', steps: step };
  return undefined;
}
async function checkCheckout(run: Run, page: PageState, steps: number): Promise<Outcome | undefined> {
  if (run.deps.presenter?.isStopped) return { status: 'stopped', steps };
  if (page.hotel && meetsConditions(page.hotel, goal(run))) return { status: 'found', steps, hotel: page.hotel };
  run.memory.lastRejection = 'rejected checkout: conditions_changed';
  await executeChoice('back_to_results', { registry: run.registry, browser: run.deps.browser, cancelled: () => run.deps.presenter?.isStopped ?? false });
  return undefined;
}
function stoppedOutcome(run: Run, steps: number): Outcome {
  return { status: run.deps.presenter?.isStopped ? 'stopped' : stopStatus(run), steps };
}
async function searchSteps(run: Run, maxSteps: number): Promise<Outcome> {
  for (let step = 1; step <= maxSteps; step += 1) {
    const outcome = await searchStep(run, step);
    if (outcome) return outcome;
  }
  const page = await observe(run);
  if (run.deps.presenter?.isStopped) return { status: 'stopped', steps: maxSteps };
  const completed = page.page === 'checkout' ? await checkCheckout(run, page, maxSteps) : undefined;
  return completed ?? { status: 'step_limit', steps: maxSteps };
}
export async function findHotel(deps: LoopDeps): Promise<Outcome> {
  const run: Run = { deps, registry: createRegistry(() => deps.presenter?.goal() ?? deps.scenario.goal, deps.interaction), memory: { ruledOut: {} }, listed: [], revision: -1 };
  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;
  await openSite(deps);
  return searchSteps(run, maxSteps);
}
async function openSite(deps: LoopDeps): Promise<void> {
  if (!deps.siteUrl) return deps.browser.open(renderSite(deps.scenario.hotels));
  if (!deps.browser.openUrl) throw new Error('This browser cannot open a site URL');
  await deps.browser.openUrl(deps.siteUrl);
}
