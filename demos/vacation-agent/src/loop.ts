import { availableActions } from './actions.js';
import { readState, type BrowserSession } from './browser.js';
import type { Choice, Chooser } from './chooser.js';
import { compactState, type CompactState, type Memory } from './compact.js';
import { executeChoice } from './executor.js';
import type { Goal, Scenario } from './hotels.js';
import type { PageState } from './page-state.js';
import { meetsConditions, violations, type HotelFacts } from './policy.js';
import { createRegistry, type Registry } from './registry.js';
import { renderSite } from './site.js';

export const DEFAULT_MAX_STEPS = 10;

export type Outcome = {
  status: 'found' | 'no_match' | 'stopped' | 'step_limit';
  steps: number;
  hotel?: HotelFacts;
};

export type StepEvent = { step: number; state: CompactState; choice: Choice; result: string };

export type LoopDeps = {
  browser: BrowserSession;
  chooser: Chooser;
  scenario: Scenario;
  maxSteps?: number;
  onStep?: (event: StepEvent) => void;
};

type Run = { deps: LoopDeps; registry: Registry; memory: Memory; listed: HotelFacts[] };
type Turn = { stopped: boolean; page: PageState };

function observe(page: PageState, run: Run): void {
  if (page.page === 'results') run.listed = page.listed;
  if (page.page !== 'hotel_details' || !page.hotel) return;
  const found = violations(page.hotel, run.deps.scenario.goal);
  if (found.length > 0) run.memory.ruledOut[page.hotel.id] = found.join(',');
}

function stopStatus(run: Run, goal: Goal): Outcome['status'] {
  const stillPossible = run.listed.some(hotel => !(hotel.id in run.memory.ruledOut) && meetsConditions(hotel, goal));
  return stillPossible ? 'stopped' : 'no_match';
}

async function takeTurn(step: number, page: PageState, run: Run): Promise<Turn> {
  const { deps, memory, registry } = run;
  const goal = deps.scenario.goal;
  const state = compactState(page, goal, memory);
  const choice = await deps.chooser.choose({ state, options: availableActions(page), page, goal, memory });
  if (choice.id === 'stop') {
    deps.onStep?.({ step, state, choice, result: 'stopped' });
    return { stopped: true, page };
  }
  const result = await executeChoice(choice.id, { registry, browser: deps.browser });
  memory.lastRejection = result.kind === 'replan' ? `rejected ${choice.id}: ${result.reason}` : undefined;
  deps.onStep?.({ step, state, choice, result: result.kind === 'done' ? 'ok' : `rejected by code: ${result.reason}` });
  return { stopped: false, page: result.state };
}

export async function findHotel(deps: LoopDeps): Promise<Outcome> {
  const run: Run = { deps, registry: createRegistry(deps.scenario.goal), memory: { ruledOut: {} }, listed: [] };
  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;
  await deps.browser.open(renderSite(deps.scenario.hotels));
  let page = await readState(deps.browser);
  for (let step = 1; step <= maxSteps; step += 1) {
    if (page.page === 'checkout') return { status: 'found', steps: step - 1, hotel: page.hotel };
    observe(page, run);
    const turn = await takeTurn(step, page, run);
    if (turn.stopped) return { status: stopStatus(run, deps.scenario.goal), steps: step };
    page = turn.page;
  }
  return page.page === 'checkout' ? { status: 'found', steps: maxSteps, hotel: page.hotel } : { status: 'step_limit', steps: maxSteps };
}
