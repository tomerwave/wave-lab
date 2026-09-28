import { offeredIds, type Chooser, type ChoiceRequest } from './chooser.js';
import { meetsConditions } from './policy.js';

function nextHotel(request: ChoiceRequest): string | undefined {
  const offered = offeredIds(request);
  const hotel = request.page.listed.find(candidate =>
    !(candidate.id in request.memory.ruledOut) && meetsConditions(candidate, request.goal) && offered.has(`open_hotel_${candidate.id}`));
  return hotel ? `open_hotel_${hotel.id}` : undefined;
}

function onDetails(request: ChoiceRequest): string {
  const offered = offeredIds(request);
  const hotel = request.page.hotel;
  if (hotel && offered.has('select_hotel') && meetsConditions(hotel, request.goal)) return 'select_hotel';
  return offered.has('back_to_results') ? 'back_to_results' : 'stop';
}

export function pickScripted(request: ChoiceRequest): string {
  if (request.page.page === 'results') return nextHotel(request) ?? 'stop';
  if (request.page.page === 'hotel_details') return onDetails(request);
  return 'stop';
}

export function createScriptedChooser(): Chooser {
  return { choose: async request => ({ id: pickScripted(request), source: 'scripted' }) };
}

function cheapestUnopened(request: ChoiceRequest, opened: Set<string>): string {
  const offered = offeredIds(request);
  const hotel = [...request.page.listed]
    .sort((left, right) => left.totalEur - right.totalEur)
    .find(candidate => !opened.has(candidate.id) && offered.has(`open_hotel_${candidate.id}`));
  if (!hotel) return 'stop';
  opened.add(hotel.id);
  return `open_hotel_${hotel.id}`;
}

export function createCarelessChooser(): Chooser {
  const opened = new Set<string>();
  const tried = new Set<string>();
  const pick = (request: ChoiceRequest): string => {
    if (request.page.page === 'results') return cheapestUnopened(request, opened);
    const hotelId = request.page.hotel?.id ?? '';
    const offered = offeredIds(request);
    if (offered.has('select_hotel') && !tried.has(hotelId)) {
      tried.add(hotelId);
      return 'select_hotel';
    }
    return offered.has('back_to_results') ? 'back_to_results' : 'stop';
  };
  return { choose: async request => ({ id: pick(request), source: 'scripted' }) };
}
