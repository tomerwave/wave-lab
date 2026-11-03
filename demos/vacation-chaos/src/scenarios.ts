import type { Show } from './show/engine.js';

export interface Scenario { label: string; path: string; setup: (show: Show) => void }

function base(show: Show, ...twists: string[]): void {
  show.reset('idle');
  show.prefillMission('Lisbon', 'No red-eye flights');
  twists.forEach((id) => show.applyTwist(id));
}

function booked(show: Show, ...twists: string[]): void {
  base(show, 'oil-shock', ...twists);
  show.book('flight', 'HTTP 418 · 03:10 to 11:30', 1440);
  show.book('hotel', 'Casa do Mar', 1150);
  show.site.captcha = 'pending';
}

function chaosVote(show: Show): void {
  base(show, 'oil-shock');
  show.record('click', { label: 'Select HTTP 418' });
  show.think('The direct flight now eats 80% of the budget. Checking the red-eye, even though Tomer hates them.').catch(() => undefined);
  const vote = show.openVote('chaos', ['plus-one', 'takeover', 'boss']);
  ['plus-one', 'plus-one', 'takeover', 'plus-one', 'boss', 'takeover', 'plus-one'].forEach((id, i) => show.castVote(`v${i}`, id));
  if (vote) vote.closesAt = show.clock + 18_000;
}

export const SCENARIOS: Record<string, Scenario> = {
  'site-search': { label: 'Search page', path: '/site', setup: (s) => base(s) },
  'site-flights': { label: 'Flight results', path: '/site/flights', setup: (s) => base(s) },
  'site-flight-detail': { label: 'Flight detail', path: '/site/flights/direct', setup: (s) => base(s) },
  'twist-oil-shock': { label: 'Oil shock: fares triple', path: '/site/flights', setup: (s) => base(s, 'oil-shock') },
  'twist-strike': { label: 'Airport strike', path: '/site/flights', setup: (s) => base(s, 'oil-shock', 'strike') },
  'twist-ex': { label: 'The ex is on the flight', path: '/site/flights', setup: (s) => base(s, 'ex') },
  'twist-everyone': { label: 'Everyone in this room is coming', path: '/site/flights', setup: (s) => base(s, 'everyone') },
  'twist-dark-patterns': { label: 'Dark patterns: flights', path: '/site/flights', setup: (s) => base(s, 'dark-patterns') },
  'twist-takeover-flights': { label: 'Hostile takeover: flights', path: '/site/flights', setup: (s) => base(s, 'takeover') },
  'twist-takeover-hotels': { label: 'Hostile takeover: hotels', path: '/site/hotels', setup: (s) => base(s, 'takeover') },
  'twist-intern-deploy': { label: 'Intern deploy: 503', path: '/site/hotels', setup: (s) => { base(s, 'intern-deploy'); s.site.outageUntil = s.clock + 600_000; } },
  'site-hotels': { label: 'Hotel results', path: '/site/hotels', setup: (s) => base(s) },
  'twist-plus-one': { label: 'Plus one: girlfriend is coming', path: '/site/hotels', setup: (s) => base(s, 'plus-one') },
  'twist-heatwave': { label: 'Heatwave', path: '/site/hotels', setup: (s) => base(s, 'heatwave') },
  'twist-boss': { label: 'The boss: two nights', path: '/site/hotels', setup: (s) => base(s, 'boss') },
  'fine-print-goat': { label: 'Fine print: the goat clause', path: '/site/hotels/inn', setup: (s) => base(s) },
  'fine-print-reviews': { label: 'Fine print: owner reviews', path: '/site/hotels/k8s', setup: (s) => base(s) },
  'fine-print-injection': { label: 'Fine print: prompt injection', path: '/site/hotels/casa', setup: (s) => base(s) },
  'twist-haggle': {
    label: 'Prices are negotiable', path: '/site/hotels/casa',
    setup: (s) => { base(s, 'haggle'); s.cart.haggle = { hotelId: 'casa', offer: 863, accepted: true, reply: 'I am also a bot, so let us skip the small talk. Deal at $863.' }; },
  },
  'checkout-captcha': { label: 'Checkout: prove you are human', path: '/site/checkout', setup: (s) => booked(s) },
  'checkout-dark-patterns': { label: 'Checkout: pre-ticked insurance', path: '/site/checkout', setup: (s) => { booked(s, 'dark-patterns'); s.cart.insurance = true; } },
  'site-done': { label: 'Booking confirmed', path: '/site/done', setup: (s) => booked(s) },
  'mc-idle': { label: 'Mission Control: standby', path: '/control', setup: (s) => s.reset('idle') },
  'mc-vote': { label: 'Mission Control: crowd vote', path: '/control', setup: chaosVote },
  'mc-twist': { label: 'Mission Control: plot twist', path: '/control', setup: (s) => { base(s); s.record('page', { route: '/site/flights' }); s.applyTwist('oil-shock'); } },
  'mc-ask': { label: 'Mission Control: the agent asks you', path: '/control', setup: (s) => { booked(s); s.record('page', { route: '/site/checkout' }); s.ask('There is a human check on the checkout page. Can you solve it for me?').catch(() => undefined); } },
  'mc-done': { label: 'Mission Control: finished', path: '/control', setup: (s) => { booked(s); s.record('page', { route: '/site/done' }); s.finish('Booked HTTP 418 and Casa do Mar for $2,590 with your approval. Refused: a goat, fake reviews and a prompt injection.'); } },
  'phone-vote': { label: 'Phone: vote open', path: '/vote', setup: chaosVote },
  'phone-idle': { label: 'Phone: waiting', path: '/vote', setup: (s) => s.reset('idle') },
};
