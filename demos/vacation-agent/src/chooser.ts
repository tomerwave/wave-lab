import type { ActionOption } from './actions.js';
import type { CompactState, Memory } from './compact.js';
import type { Goal } from './hotels.js';
import type { PageState } from './page-state.js';

export type Choice = { id: string; source: 'scripted' | 'jev'; confidence?: number };

export type ChoiceRequest = {
  state: CompactState;
  options: ActionOption[];
  page: PageState;
  goal: Goal;
  memory: Memory;
};

export interface Chooser {
  choose(request: ChoiceRequest): Promise<Choice>;
}

export function offeredIds(request: ChoiceRequest): Set<string> {
  return new Set(request.options.map(option => option.id));
}
