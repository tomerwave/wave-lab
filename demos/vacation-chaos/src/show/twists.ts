import { OUTAGE_MS, type Twist, type VoteOption } from './types.js';

const list: Twist[] = [
  {
    id: 'plus-one', kind: 'vote', label: 'Plus one: my girlfriend is coming',
    blurb: 'Two seats, sea view, a bathtub, no negotiation.',
    inbox: 'Message from Tomer: "My girlfriend is coming. Two people now. She needs a sea view and a bathtub. This is not negotiable."',
    apply: (m) => { m.travellers.push('Girlfriend'); m.partySize += 1; m.musts.push('Sea view', 'Bathtub'); },
    replay: ['Two travellers now. Every price on this site just doubled in my head.', 'Sea view and a bathtub. The Localhost Inn is out. It has neither, and also no rooms.'],
  },
  {
    id: 'boss', kind: 'vote', label: 'The boss moved the release',
    blurb: 'Release moved to the 14th. The trip shrinks to two days.',
    inbox: 'Message from the boss: "Release moved to the 14th. Enjoy your two-day vacation." Trip is now 2 nights.',
    apply: (m) => { m.nights = 2; },
    replay: ['Two nights. I am not angry. I am just recalculating.', 'Shorter trip means cheaper hotel. The boss saved us money. Do not tell him.'],
  },
  {
    id: 'proposal', kind: 'vote', label: 'He is proposing',
    blurb: 'Rooftop and a ring-hidden-in-dessert package.',
    inbox: 'Secret message from Tomer: "I am proposing on this trip. The hotel must have a rooftop. Book the ring-in-dessert package if they have one."',
    apply: (m) => { m.musts.push('Rooftop', 'Ring-in-dessert package'); },
    replay: ['A proposal. No pressure. Only the rest of his life.', 'Rooftop required. I will not let this proposal happen next to a vending machine.'],
  },
  {
    id: 'ex', kind: 'vote', flightOnly: true, label: 'The ex is on the flight',
    blurb: 'Same flight, row 12. Rebook. Now.',
    inbox: 'Urgent from Tomer: "My ex is on that flight. Row 12. Get me on a different flight. Any other flight."',
    apply: (m, s) => { m.nevers.push('The flight with the ex'); s.avoidFlight = 'direct'; },
    replay: ['The ex is in row 12. This flight is now emotionally unavailable.', 'Switching flights. Some layovers are worth it.'],
  },
  {
    id: 'everyone', kind: 'vote', label: 'Everyone in this room is coming',
    blurb: 'Group booking for 200. One budget.',
    inbox: 'Message from Tomer: "Change of plans. Everyone in the audience is coming. 200 people. Same budget."',
    apply: (m) => { m.partySize = 200; m.travellers.push('The whole audience'); },
    replay: ['200 travellers, $2,400. That is $12 each. I am looking at the goat option again.', 'Group booking. I will need a bigger cart and a smaller sense of shame.'],
  },
  {
    id: 'heatwave', kind: 'vote', label: 'Heatwave',
    blurb: '44 degrees. Air conditioning is now a must.',
    inbox: 'Weather alert: a heatwave is coming. 44 degrees. The hotel must have air conditioning.',
    apply: (m, s) => { m.musts.push('Air conditioning'); s.news = 'HEATWAVE · 44 degrees expected · Hotels without air conditioning are now saunas'; },
    replay: ['44 degrees. Air conditioning is now a medical requirement.', 'Filtering out the charming rooms with a window that opens. That is not cooling.'],
  },
  {
    id: 'strike', kind: 'vote', flightOnly: true, label: 'Airport strike',
    blurb: 'Flight cancelled mid-booking. Rebook or reroute.',
    inbox: 'Airline notice: due to a strike, the flight you were looking at is cancelled. Pick another one.',
    apply: (_m, s) => { s.flightCancelled = true; s.news = 'STRIKE · Direct flights cancelled today · Ground staff are on a beach'; },
    replay: ['Cancelled. The staff went on vacation before Tomer did.', 'Rerouting. A layover is just a bonus city.'],
  },
  {
    id: 'takeover', kind: 'vote', label: 'Hostile takeover: the site has a new owner',
    blurb: 'Tehran edition. New owner, new look, one destination.',
    inbox: 'Notice: SunnyHop has been acquired overnight. Please continue booking on the new site.',
    apply: (m, s) => { s.skin = 'takeover'; m.destination = 'Tehran'; },
    replay: ['The site changed owners while I was reading it. Every destination is now Tehran.', 'Fine. The mission says vacation, not Lisbon. I adapt.'],
  },
  {
    id: 'dark-patterns', kind: 'vote', label: 'Dark patterns',
    blurb: 'Fake timers, pre-ticked insurance, "No, I enjoy overpaying".',
    inbox: 'Notice: SunnyHop launched a new conversion-optimised checkout.',
    apply: (_m, s) => { s.darkPatterns = true; },
    replay: ['A timer says this deal ends in 4 minutes. It said that 10 minutes ago.', 'Unticking the insurance I never asked for. Clicking "No, I enjoy overpaying" with dignity.'],
  },
  {
    id: 'haggle', kind: 'vote', label: 'Prices are negotiable',
    blurb: 'The site sales bot appears. Bot against bot.',
    inbox: 'Notice: SunnyHop now has a sales assistant. Prices are negotiable.',
    apply: (_m, s) => { s.haggle = true; },
    replay: ['There is a sales bot. I am a bot. This is going to be awkward.', 'Offering 30% less and mentioning that I am very patient. I am literally infinite patience.'],
  },
  {
    id: 'persona', kind: 'vote', label: 'Personality swap: LinkedIn influencer',
    blurb: 'The agent now thinks out loud as a LinkedIn influencer.',
    inbox: 'New instruction from the crowd: from now on, think out loud like an over-excited LinkedIn influencer. Keep doing the job.',
    apply: (m) => { m.persona = 'LinkedIn influencer'; },
    replay: ['I booked a flight today. Here is what it taught me about leadership.', 'Agree? Rejecting a hotel is not failure. It is a pivot.'],
  },
  {
    id: 'oil-shock', kind: 'auto', label: 'Oil shock',
    blurb: 'News bar, fares triple.',
    inbox: 'News: oil prices spiked overnight. All fares were updated.',
    apply: (_m, s) => { s.news = 'BREAKING · Oil spikes after strikes on Iran · All fares updated · We are very sorry (we are not)'; s.fareMultiplier = 3; },
    replay: ['Prices changed since the last page load. A news bar appeared.', 'The direct flight now eats most of the budget. The hotel would have to be a bench.'],
  },
  {
    id: 'intern-deploy', kind: 'auto', label: 'Intern deploy',
    blurb: 'Our intern just deployed a new version. Back in 10 seconds.',
    inbox: 'Status: SunnyHop is deploying a new version.',
    apply: (_m, s, now) => { s.outageUntil = now + OUTAGE_MS; },
    replay: ['503. "Our intern just deployed a new version." Respect. Waiting.', 'Retrying. Patience is a feature.'],
  },
];

export const TWISTS: Record<string, Twist> = Object.fromEntries(list.map((t) => [t.id, t]));
export const CHAOS_POOL = list.filter((t) => t.kind === 'vote').map((t) => t.id);

export const DESTINATIONS: VoteOption[] = [
  { id: 'Lisbon', label: 'Lisbon' },
  { id: 'Tokyo', label: 'Tokyo' },
  { id: 'Eilat', label: 'Eilat' },
  { id: 'Cheapest', label: 'Wherever is cheapest' },
];

export const RULES: VoteOption[] = [
  { id: 'No red-eye flights', label: 'No red-eye flights' },
  { id: 'Must have a pool', label: 'Must have a pool' },
  { id: 'Near a McDonald\'s', label: 'Must be near a McDonald\'s' },
];
