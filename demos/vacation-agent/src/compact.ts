import { availableActions } from './actions.js';
import type { Goal } from './hotels.js';
import type { PageState } from './page-state.js';

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type CompactState = { [key: string]: Json };

export type Memory = {
  ruledOut: Record<string, string>;
  lastRejection?: string;
};

function pageFacts(state: PageState): CompactState {
  if (state.page === 'results') {
    return { hotels: state.listed.map(hotel => ({ id: hotel.id, total_eur: hotel.totalEur, accessible: hotel.accessible })) };
  }
  if (!state.hotel) return {};
  const { id, available, accessible, totalEur } = state.hotel;
  return { [`hotel_${id}`]: available ? { accessible, total_eur: totalEur } : 'sold_out' };
}

function memoryFacts(memory: Memory): CompactState {
  const facts: CompactState = {};
  if (Object.keys(memory.ruledOut).length > 0) facts.ruled_out = { ...memory.ruledOut };
  if (memory.lastRejection) facts.last_result = memory.lastRejection;
  return facts;
}

export function compactState(state: PageState, goal: Goal, memory: Memory): CompactState {
  return {
    subgoal: goal.subgoal,
    budget_eur: goal.budgetEur,
    nights: goal.nights,
    page: state.page,
    ...memoryFacts(memory),
    ...pageFacts(state),
    available_actions: availableActions(state).map(option => option.id),
  };
}
