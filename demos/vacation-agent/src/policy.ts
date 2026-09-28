import type { Goal } from './hotels.js';

export type HotelFacts = {
  id: string;
  totalEur: number;
  accessible: boolean;
  available?: boolean;
};

export type Violation = 'sold_out' | 'not_accessible' | 'over_budget' | 'unknown_price';

export function violations(hotel: HotelFacts, goal: Goal): Violation[] {
  const found: Violation[] = [];
  if (hotel.available === false) found.push('sold_out');
  if (!hotel.accessible) found.push('not_accessible');
  if (!Number.isInteger(hotel.totalEur) || hotel.totalEur <= 0) found.push('unknown_price');
  else if (hotel.totalEur > goal.budgetEur) found.push('over_budget');
  return found;
}

export function meetsConditions(hotel: HotelFacts, goal: Goal): boolean {
  return violations(hotel, goal).length === 0;
}
