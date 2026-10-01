import { availableActions } from './actions.js';
import type { BrowserSession } from './browser.js';
import type { Goal } from './hotels.js';
import type { PageState } from './page-state.js';
import { violations } from './policy.js';

export type Verdict = { ok: true } | { ok: false; reason: string };

export type RegisteredAction = {
  allowed(state: PageState): Verdict;
  run(browser: BrowserSession): Promise<void>;
};

export type Registry = { get(id: string): RegisteredAction | undefined };

const OK: Verdict = { ok: true };

function onPage(actionId: string, state: PageState): Verdict {
  return availableActions(state).some(option => option.id === actionId) ? OK : { ok: false, reason: 'not_available_now' };
}

function clickAction(actionId: string, testId: string): RegisteredAction {
  return {
    allowed: state => onPage(actionId, state),
    run: browser => browser.click(testId),
  };
}

function selectHotel(goal: () => Goal): RegisteredAction {
  const click = clickAction('select_hotel', 'select-hotel');
  return {
    run: click.run,
    allowed(state) {
      const verdict = click.allowed(state);
      if (!verdict.ok) return verdict;
      if (!state.hotel) return { ok: false, reason: 'no_hotel_on_page' };
      const found = violations(state.hotel, goal());
      return found.length === 0 ? OK : { ok: false, reason: found.join(',') };
    },
  };
}

function resolve(id: string, goal: () => Goal): RegisteredAction | undefined {
  if (id === 'back_to_results') return clickAction(id, 'back-to-results');
  if (id === 'select_hotel') return selectHotel(goal);
  const hotel = /^open_hotel_([A-Z])$/.exec(id)?.[1];
  return hotel ? clickAction(id, `open-hotel-${hotel}`) : undefined;
}

export function createRegistry(goal: Goal | (() => Goal)): Registry {
  return { get: id => resolve(id, typeof goal === 'function' ? goal : () => goal) };
}
