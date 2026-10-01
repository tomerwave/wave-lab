import type { PageState } from './page-state.js';
import type { HotelFacts } from './policy.js';

export type ActionOption = { id: string; description: string };

const STOP: ActionOption = { id: 'stop', description: 'Stop and ask the traveler what to change' };

function describeHotel(hotel: HotelFacts): string {
  const access = hotel.accessible ? 'accessible' : 'not accessible';
  return `Open hotel ${hotel.id}: ${hotel.totalEur} EUR for the stay, ${access}`;
}

function resultActions(state: PageState): ActionOption[] {
  return state.listed
    .filter(hotel => state.enabledButtons.includes(`open-hotel-${hotel.id}`))
    .map(hotel => ({ id: `open_hotel_${hotel.id}`, description: describeHotel(hotel) }));
}

function detailActions(state: PageState): ActionOption[] {
  const options: ActionOption[] = [];
  if (state.enabledButtons.includes('select-hotel')) options.push({ id: 'select_hotel', description: 'Choose this hotel and stop before payment' });
  if (state.enabledButtons.includes('back-to-results')) options.push({ id: 'back_to_results', description: 'Return to the search results' });
  return options;
}

export function availableActions(state: PageState): ActionOption[] {
  if (state.page === 'results') return [...resultActions(state), STOP];
  if (state.page === 'hotel_details') return [...detailActions(state), STOP];
  if (state.page === 'checkout') return [{ id: 'back_to_results', description: 'Return to results to recheck conditions' }, STOP];
  return [STOP];
}
