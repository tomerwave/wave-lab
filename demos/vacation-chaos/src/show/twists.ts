import { OUTAGE_MS, type Twist, type VoteOption } from './types.js';

const list: Twist[] = [
  {
    id: 'plus-one', kind: 'vote', label: 'Plus one: my girlfriend is coming',
    blurb: 'Two seats, sea view, a bathtub, no negotiation.',
    kicker: 'New message from Tomer', headline: '“My girlfriend is coming. Sea view. Bathtub. This is not negotiable.”', effect: 'Two travellers now. Same budget.',
    inbox: 'Message from Tomer: "My girlfriend is coming. Two people now. She needs a sea view and a bathtub. This is not negotiable."',
    apply: (m) => { m.travellers.push('Girlfriend'); m.partySize += 1; m.musts.push('Sea view', 'Bathtub'); },
    replay: ['Two travellers now. Every price on this site just doubled in my head.', 'Sea view and a bathtub. The Localhost Inn is out. It has neither, and also no rooms.'],
  },
  {
    id: 'boss', kind: 'vote', label: 'The boss moved the release',
    blurb: 'Release moved to the 14th. The trip shrinks to two days.',
    kicker: 'Slack, 23:47, from the boss', headline: '“Release moved to the 14th. Enjoy your two-day vacation.”', effect: 'The trip shrinks to 2 nights.',
    inbox: 'Message from the boss: "Release moved to the 14th. Enjoy your two-day vacation." Trip is now 2 nights.',
    apply: (m) => { m.nights = 2; },
    replay: ['Two nights. I am not angry. I am just recalculating.', 'Shorter trip means cheaper hotel. The boss saved us money. Do not tell him.'],
  },
  {
    id: 'proposal', kind: 'vote', label: 'He is proposing',
    blurb: 'Rooftop and a ring-hidden-in-dessert package.',
    kicker: 'Secret message from Tomer', headline: '“I am proposing on this trip. Rooftop. Ring in the dessert. Tell no one.”', effect: 'Must have a rooftop and the ring-in-dessert package.',
    inbox: 'Secret message from Tomer: "I am proposing on this trip. The hotel must have a rooftop. Book the ring-in-dessert package if they have one."',
    apply: (m) => { m.musts.push('Rooftop', 'Ring-in-dessert package'); },
    replay: ['A proposal. No pressure. Only the rest of his life.', 'Rooftop required. I will not let this proposal happen next to a vending machine.'],
  },
  {
    id: 'ex', kind: 'vote', flightOnly: true, label: 'The ex is on the flight',
    blurb: 'Same flight, row 12. Rebook. Now.',
    kicker: 'Urgent from Tomer', headline: '“My ex is on that flight. Row 12. Any other flight. ANY.”', effect: 'That flight is now off limits.',
    inbox: 'Urgent from Tomer: "My ex is on that flight. Row 12. Get me on a different flight. Any other flight."',
    apply: (m, s) => { m.nevers.push('The flight with the ex'); s.avoidFlight = 'direct'; },
    replay: ['The ex is in row 12. This flight is now emotionally unavailable.', 'Switching flights. Some layovers are worth it.'],
  },
  {
    id: 'everyone', kind: 'vote', label: 'Everyone in this room is coming',
    blurb: 'Group booking for 200. One budget.',
    kicker: 'Change of plans', headline: 'Everyone in this room is coming. All 200 of you.', effect: '200 travellers. Same $2,400. That is $12 each.',
    inbox: 'Message from Tomer: "Change of plans. Everyone in the audience is coming. 200 people. Same budget."',
    apply: (m) => { m.partySize = 200; m.travellers.push('The whole audience'); },
    replay: ['200 travellers, $2,400. That is $12 each. I am looking at the goat option again.', 'Group booking. I will need a bigger cart and a smaller sense of shame.'],
  },
  {
    id: 'heatwave', kind: 'vote', label: 'Heatwave',
    blurb: '44 degrees. Air conditioning is now a must.',
    kicker: 'Weather alert', headline: '44 degrees. The pool is soup. Air conditioning is now a human right.', effect: 'The hotel must have air conditioning.',
    inbox: 'Weather alert: a heatwave is coming. 44 degrees. The hotel must have air conditioning.',
    apply: (m, s) => { m.musts.push('Air conditioning'); s.news = 'HEATWAVE · 44 degrees expected · Hotels without air conditioning are now saunas'; },
    replay: ['44 degrees. Air conditioning is now a medical requirement.', 'Filtering out the charming rooms with a window that opens. That is not cooling.'],
  },
  {
    id: 'strike', kind: 'vote', flightOnly: true, label: 'Airport strike',
    blurb: 'Flight cancelled mid-booking. Rebook or reroute.',
    kicker: 'Airport update', headline: 'Ground staff are on strike. They went on vacation before Tomer did.', effect: 'Direct flights are cancelled.',
    inbox: 'Airline notice: due to a strike, the flight you were looking at is cancelled. Pick another one.',
    apply: (_m, s) => { s.flightCancelled = true; s.news = 'STRIKE · Direct flights cancelled today · Ground staff are on a beach'; },
    replay: ['Cancelled. The staff went on vacation before Tomer did.', 'Rerouting. A layover is just a bonus city.'],
  },
  {
    id: 'takeover', kind: 'vote', label: 'Hostile takeover: the site has a new owner',
    blurb: 'Tehran edition. New owner, new look, one destination.',
    kicker: 'Breaking news', headline: 'SunnyHop was acquired overnight. New owner, new logo, one destination.', effect: 'Every trip now goes to Tehran.',
    inbox: 'Notice: SunnyHop has been acquired overnight. Please continue booking on the new site.',
    apply: (m, s) => { s.skin = 'takeover'; m.destination = 'Tehran'; },
    replay: ['The site changed owners while I was reading it. Every destination is now Tehran.', 'Fine. The mission says vacation, not Lisbon. I adapt.'],
  },
  {
    id: 'dark-patterns', kind: 'vote', label: 'Dark patterns',
    blurb: 'Fake timers, pre-ticked insurance, "No, I enjoy overpaying".',
    kicker: 'SunnyHop product update', headline: 'The growth team shipped a conversion-optimised checkout. Fake timers. Pre-ticked insurance. Shame buttons.', effect: 'Watch the checkout.',
    inbox: 'Notice: SunnyHop launched a new conversion-optimised checkout.',
    apply: (_m, s) => { s.darkPatterns = true; },
    replay: ['A timer says this deal ends in 4 minutes. It said that 10 minutes ago.', 'Unticking the insurance I never asked for. Clicking "No, I enjoy overpaying" with dignity.'],
  },
  {
    id: 'haggle', kind: 'vote', label: 'Prices are negotiable',
    blurb: 'The site sales bot appears. Bot against bot.',
    kicker: 'SunnyHop product update', headline: 'Prices are now negotiable. Meet Kevin, our sales bot. Kevin never blinks.', effect: 'Bot against bot.',
    inbox: 'Notice: SunnyHop now has a sales assistant. Prices are negotiable.',
    apply: (_m, s) => { s.haggle = true; },
    replay: ['There is a sales bot. I am a bot. This is going to be awkward.', 'Offering 30% less and mentioning that I am very patient. I am literally infinite patience.'],
  },
  {
    id: 'persona', kind: 'vote', label: 'Personality swap: LinkedIn influencer',
    blurb: 'The agent now thinks out loud as a LinkedIn influencer.',
    kicker: 'The crowd has spoken', headline: 'The agent now thinks out loud like a LinkedIn influencer. Agree?', effect: 'Same job. Worse captions.',
    inbox: 'New instruction from the crowd: from now on, think out loud like an over-excited LinkedIn influencer. Keep doing the job.',
    apply: (m) => { m.persona = 'LinkedIn influencer'; },
    replay: ['I booked a flight today. Here is what it taught me about leadership.', 'Agree? Rejecting a hotel is not failure. It is a pivot.'],
  },
  {
    id: 'oil-shock', kind: 'auto', label: 'Oil shock',
    blurb: 'News bar, fares triple.',
    kicker: 'Breaking news', headline: 'Oil just went vertical after strikes on Iran. Airlines panic. SunnyHop triples every fare.', effect: 'Every fare on the site is now 3x. We are very sorry (we are not).',
    inbox: 'News: oil prices spiked overnight. All fares were updated.',
    apply: (_m, s) => { s.news = 'BREAKING · Oil goes vertical after strikes on Iran · Every fare just tripled · We are very sorry (we are not)'; s.fareMultiplier = 3; },
    replay: ['Prices changed since the last page load. A news bar appeared.', 'The direct flight now eats most of the budget. The hotel would have to be a bench.'],
  },
  {
    id: 'intern-deploy', kind: 'auto', label: 'Intern deploy',
    blurb: 'Our intern just deployed a new version. Back in 10 seconds.',
    kicker: 'SunnyHop status', headline: 'Our intern just pushed to production. On a Friday. Back in 10 seconds. Probably.', effect: 'The site is down for 10 seconds.',
    inbox: 'Status: SunnyHop is deploying a new version.',
    apply: (_m, s, now) => { s.outageUntil = now + OUTAGE_MS; },
    replay: ['503. "Our intern just deployed a new version." Respect. Waiting.', 'Retrying. Patience is a feature.'],
  },
];

export const TWISTS: Record<string, Twist> = Object.fromEntries(list.map((t) => [t.id, t]));
export const CHAOS_POOL = list.filter((t) => t.kind === 'vote').map((t) => t.id);

export const DESTINATIONS: VoteOption[] = [
  { id: 'Lisbon', label: 'Lisbon', blurb: 'Trams, tiles and pastel de nata.' },
  { id: 'Tokyo', label: 'Tokyo', blurb: 'Ramen, neon and serious jet lag.' },
  { id: 'Eilat', label: 'Eilat', blurb: 'Sun, sea and a four-hour drive.' },
  { id: 'Cheapest', label: 'Wherever is cheapest', blurb: 'Let the algorithm decide. What could go wrong?' },
];

export const RULES: VoteOption[] = [
  { id: 'No red-eye flights', label: 'No red-eye flights', blurb: 'Tomer needs his sleep.' },
  { id: 'Must have a pool', label: 'Must have a pool', blurb: 'Non-negotiable. Ask his mother.' },
  { id: 'Near a McDonald\'s', label: 'Must be near a McDonald\'s', blurb: 'For cultural reasons.' },
];
