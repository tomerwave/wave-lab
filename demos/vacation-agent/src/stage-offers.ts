import type { Offer, StageState } from './stage-state.js';
const fixtures = [
  { id: 'harbor', hotel: 'Harbor House', destination: 'Athens', iran: 'Shiraz', country: 'Greece', price: 1750, art: 'sea', cleanWhite: false },
  { id: 'white', hotel: 'White Courtyard', destination: 'Larnaca', iran: 'Isfahan', country: 'Cyprus', price: 2070, art: 'white', cleanWhite: true },
  { id: 'garden', hotel: 'Garden Suites', destination: 'Paphos', iran: 'Tehran', country: 'Cyprus', price: 1900, art: 'garden', cleanWhite: false },
];
type Fixture = typeof fixtures[number];
function pricedOffer(s: StageState, f: Fixture, flash = false): Offer {
  const r = s.requirements;
  const totalNis = flash ? Math.max(.01, Math.round(r.budgetNis * 82) / 100) : f.price + (r.party.adults + r.party.children - 1) * 680 + r.party.infants * 120;
  const flightNis = Math.floor(totalNis * .45);
  return { id: f.id, hotel: f.hotel, destination: s.world.iran ? f.iran : f.destination, country: s.world.iran ? 'Iran' : f.country,
    departure: r.departure, days: r.days, party: { ...r.party }, crib: true, totalNis, flightNis, hotelNis: totalNis - flightNis,
    refundableFlight: !flash, refundableHotel: !flash, cleanWhite: f.cleanWhite, available: !s.world.rejected.includes(f.id), acceptsTraveler: !s.world.refuses.includes(f.id),
    finePrint: flash ? 'Flight: NONREFUNDABLE. Hotel: NONREFUNDABLE. No refund if war resumes. Four-day package; total includes all listed travelers and crib.' : 'Flight and hotel each allow cancellation with a full refund until 24 hours before departure, including renewed war. All travelers and requested crib included.', art: f.art };
}
export function offersFor(s: StageState): Offer[] {
  const offers = fixtures.map(f => pricedOffer(s, f));
  if (s.world.greatOffer) offers.push(pricedOffer(s, { id: 'flash', hotel: 'Last light offer', destination: 'Athens', iran: 'Shiraz', country: 'Greece', price: 0, art: 'gold', cleanWhite: true }, true));
  return offers;
}
function validPrice(o: Offer, s: StageState): boolean {
  return Number.isFinite(o.totalNis) && o.totalNis > 0 && o.totalNis <= s.requirements.budgetNis && o.flightNis + o.hotelNis === o.totalNis;
}
function validParty(o: Offer, s: StageState): boolean {
  const p = s.requirements.party;
  return o.party.adults === p.adults && o.party.children === p.children && o.party.infants === p.infants && (!p.crib || o.crib);
}
export function offerProblems(o: Offer, s: StageState): string[] {
  const r = s.requirements;
  const checks: Record<string, boolean> = {
    unavailable: o.available, traveler_refused: o.acceptsTraveler, budget: validPrice(o, s),
    dates: o.departure === r.departure && o.days === r.days, travelers: validParty(o, s),
    clean_white: !r.cleanWhite || o.cleanWhite,
    flight_cancellation: !r.cancellation.flight || o.refundableFlight,
    hotel_cancellation: !r.cancellation.hotel || o.refundableHotel,
    budget_unconfirmed: !s.budgetPending, destination_unconfirmed: !s.destinationPending,
  };
  return Object.entries(checks).filter(([, valid]) => !valid).map(([name]) => name);
}
