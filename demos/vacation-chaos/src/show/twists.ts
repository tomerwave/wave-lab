import { OUTAGE_MS, type Twist, type VoteOption } from './types.js';

const list: Twist[] = [
  {
    id: 'plus-one', kind: 'vote', label: 'Plus one: my girlfriend is coming',
    blurb: 'Two seats, sea view, a bathtub, no negotiation.',
    look: 'message', kicker: 'New message from Tomer', headline: 'Babe is coming. Sea view. Bathtub. Not negotiable.', effect: 'Two travellers now. Same budget.', sticker: 'PLUS ONE',
    lines: ['Babe is coming', 'She needs a sea view', 'And a bathtub', 'This is not negotiable'],
    inbox: 'Message from Tomer: "My girlfriend is coming. Two people now. She needs a sea view and a bathtub. This is not negotiable."',
    apply: (m) => { m.travellers.push('Girlfriend'); m.partySize += 1; m.musts.push('Sea view', 'Bathtub'); },
    replay: ['Two travellers now. Every price on this site just doubled in my head.', 'Sea view and a bathtub. The Localhost Inn is out. It has neither, and also no rooms.'],
  },
  {
    id: 'boss', kind: 'vote', label: 'The boss moved the release',
    blurb: 'Release moved to the 14th. The trip shrinks to two days.',
    look: 'message', kicker: 'Slack · the boss · 23:47', headline: 'Release moved to the 14th. Enjoy your two-day vacation.', effect: 'The trip shrinks to 2 nights.', sticker: 'CORPORATE',
    lines: ['Hey, quick one', 'Release moved to the 14th', 'Enjoy your 2-day vacation :)'],
    inbox: 'Message from the boss: "Release moved to the 14th. Enjoy your two-day vacation." Trip is now 2 nights.',
    apply: (m) => { m.nights = 2; },
    replay: ['Two nights. I am not angry. I am just recalculating.', 'Shorter trip means cheaper hotel. The boss saved us money. Do not tell him.'],
  },
  {
    id: 'proposal', kind: 'vote', label: 'He is proposing',
    blurb: 'Rooftop and a ring-hidden-in-dessert package.',
    look: 'message', kicker: 'Secret message from Tomer', headline: 'He is proposing on this trip.', effect: 'Must have a rooftop and the ring-in-dessert package.', sticker: 'NO PRESSURE',
    lines: ['Do not tell anyone', 'I am proposing on this trip', 'Rooftop. Ring in the dessert.', 'Mess this up and I am switching to Gemini'],
    inbox: 'Secret message from Tomer: "I am proposing on this trip. The hotel must have a rooftop. Book the ring-in-dessert package if they have one."',
    apply: (m) => { m.musts.push('Rooftop', 'Ring-in-dessert package'); },
    replay: ['A proposal. No pressure. Only the rest of his life.', 'Rooftop required. I will not let this proposal happen next to a vending machine.'],
  },
  {
    id: 'ex', kind: 'vote', flightOnly: true, label: 'The ex is on the flight',
    blurb: 'Same flight, row 12. Rebook. Now.',
    look: 'message', kicker: 'Urgent from Tomer', headline: 'My ex is on that flight. Row 12.', effect: 'That flight is now off limits.', sticker: 'AWKWARD',
    lines: ['URGENT', 'My ex is on that flight', 'Row 12', 'ANY other flight. ANY.'],
    inbox: 'Urgent from Tomer: "My ex is on that flight. Row 12. Get me on a different flight. Any other flight."',
    apply: (m, s) => { m.nevers.push('The flight with the ex'); s.avoidFlight = 'direct'; },
    replay: ['The ex is in row 12. This flight is now emotionally unavailable.', 'Switching flights. Some layovers are worth it.'],
  },
  {
    id: 'everyone', kind: 'vote', label: 'Everyone in this room is coming',
    blurb: 'Group booking for 200. One budget.',
    look: 'message', kicker: 'Change of plans', headline: 'Everyone in this room is coming. All 200 of you.', effect: '200 travellers. Same $2,400. That is $12 each.', sticker: 'GROUP CHAT',
    lines: ['Change of plans', 'Everyone in this room is coming', 'All 200 of you', 'Same budget. $12 each. Bring snacks.'],
    inbox: 'Message from Tomer: "Change of plans. Everyone in the audience is coming. 200 people. Same budget."',
    apply: (m) => { m.partySize = 200; m.travellers.push('The whole audience'); },
    replay: ['200 travellers, $2,400. That is $12 each. I am looking at the goat option again.', 'Group booking. I will need a bigger cart and a smaller sense of shame.'],
  },
  {
    id: 'heatwave', kind: 'vote', label: 'Heatwave',
    blurb: '44 degrees. Air conditioning is now a must.',
    look: 'alert', kicker: 'Weather alert · Extreme heat', headline: '44°C. The pool is soup.', effect: 'Air conditioning is now a human right. The hotel must have it.', sticker: 'THIS IS FINE',
    lines: ['44°'],
    inbox: 'Weather alert: a heatwave is coming. 44 degrees. The hotel must have air conditioning.',
    apply: (m, s) => { m.musts.push('Air conditioning'); s.news = 'HEATWAVE · 44 degrees expected · Hotels without air conditioning are now saunas'; },
    replay: ['44 degrees. Air conditioning is now a medical requirement.', 'Filtering out the charming rooms with a window that opens. That is not cooling.'],
  },
  {
    id: 'strike', kind: 'vote', flightOnly: true, label: 'Airport strike',
    blurb: 'Flight cancelled mid-booking. Rebook or reroute.',
    look: 'alert', kicker: 'Airport update', headline: 'Ground staff are on strike. They went on vacation before Tomer did.', effect: 'Direct flights are cancelled.', sticker: 'OUT OF OFFICE',
    lines: ['CANCELLED'],
    inbox: 'Airline notice: due to a strike, the flight you were looking at is cancelled. Pick another one.',
    apply: (_m, s) => { s.flightCancelled = true; s.news = 'STRIKE · Direct flights cancelled today · Ground staff are on a beach'; },
    replay: ['Cancelled. The staff went on vacation before Tomer did.', 'Rerouting. A layover is just a bonus city.'],
  },
  {
    id: 'takeover', kind: 'vote', label: 'Hostile takeover: the site has a new owner',
    blurb: 'Tehran edition. New owner, new look, one destination.',
    look: 'news', kicker: 'Breaking news', headline: 'SunnyHop bought overnight by a mystery buyer in Tehran.', effect: 'New owner. New logo. One destination.', sticker: 'UNDER NEW MANAGEMENT',
    lines: ['PERSIAHOP: ALL DESTINATIONS HAVE BEEN SIMPLIFIED', 'LISBON? NEVER HEARD OF IT', 'CUSTOMER SERVICE NOW OPEN 9:00 TO 9:05', 'REFUNDS: INSHALLAH'],
    inbox: 'Notice: SunnyHop has been acquired overnight. Please continue booking on the new site.',
    apply: (m, s) => { s.skin = 'takeover'; m.destination = 'Tehran'; },
    replay: ['The site changed owners while I was reading it. Every destination is now Tehran.', 'Fine. The mission says vacation, not Lisbon. I adapt.'],
  },
  {
    id: 'dark-patterns', kind: 'vote', label: 'Dark patterns',
    blurb: 'Fake timers, pre-ticked insurance, "No, I enjoy overpaying".',
    look: 'status', kicker: 'SunnyHop product update', headline: 'The growth team shipped a conversion-optimised checkout.', effect: 'Watch the checkout.', sticker: 'TOTALLY ETHICAL',
    lines: ['New: timers that never end', 'New: insurance you did not ask for', 'New: a button called No, I enjoy overpaying', 'New: guilt'],
    inbox: 'Notice: SunnyHop launched a new conversion-optimised checkout.',
    apply: (_m, s) => { s.darkPatterns = true; },
    replay: ['A timer says this deal ends in 4 minutes. It said that 10 minutes ago.', 'Unticking the insurance I never asked for. Clicking "No, I enjoy overpaying" with dignity.'],
  },
  {
    id: 'haggle', kind: 'vote', label: 'Prices are negotiable',
    blurb: 'The site sales bot appears. Bot against bot.',
    look: 'status', kicker: 'SunnyHop product update', headline: 'Prices are now negotiable. Meet Kevin, our sales bot.', effect: 'Bot against bot.', sticker: 'BOT VS BOT',
    lines: ['Kevin: Hi! Are you a human?', 'Agent: Define human.', 'Kevin: ...', 'Kevin never blinks'],
    inbox: 'Notice: SunnyHop now has a sales assistant. Prices are negotiable.',
    apply: (_m, s) => { s.haggle = true; },
    replay: ['There is a sales bot. I am a bot. This is going to be awkward.', 'Offering 30% less and mentioning that I am very patient. I am literally infinite patience.'],
  },
  {
    id: 'persona', kind: 'vote', label: 'Personality swap: LinkedIn influencer',
    blurb: 'The agent now thinks out loud as a LinkedIn influencer.',
    look: 'post', kicker: 'The crowd has spoken', headline: 'I booked a flight today. Here is what it taught me about leadership.', effect: 'The agent now thinks out loud like a LinkedIn influencer. Same job. Worse captions.', sticker: 'THOUGHT LEADER',
    lines: ['Agree?', '1,204 reactions · 318 comments · 47 reposts'],
    inbox: 'New instruction from the crowd: from now on, think out loud like an over-excited LinkedIn influencer. Keep doing the job.',
    apply: (m) => { m.persona = 'LinkedIn influencer'; },
    replay: ['I booked a flight today. Here is what it taught me about leadership.', 'Agree? Rejecting a hotel is not failure. It is a pivot.'],
  },
  {
    id: 'oil-shock', kind: 'auto', label: 'Oil shock',
    blurb: 'News bar, fares triple.',
    look: 'news', kicker: 'Breaking news', headline: 'Trump bombs Iran. Oil goes to the moon.', effect: 'SunnyHop just tripled every fare. We are very sorry (we are not).', sticker: 'TO THE MOON',
    lines: ['OIL +300% · ANALYSTS: LOL', 'TRUMP: THE BEST OIL PRICES, MAYBE EVER', 'AIRLINES DISCOVER A NEW FEE: VIBES', 'TOMER\'S BUDGET HAS LEFT THE CHAT'],
    inbox: 'News: oil prices spiked overnight. All fares were updated.',
    apply: (_m, s) => { s.news = 'BREAKING · Trump bombs Iran · Oil goes to the moon · Every fare just tripled · We are very sorry (we are not)'; s.fareMultiplier = 3; },
    replay: ['Prices changed since the last page load. A news bar appeared.', 'The direct flight now eats most of the budget. The hotel would have to be a bench.'],
  },
  {
    id: 'intern-deploy', kind: 'auto', label: 'Intern deploy',
    blurb: `Our intern just deployed a new version. Back in ${OUTAGE_MS / 1000} seconds.`,
    look: 'status', kicker: 'SunnyHop status · Major outage', headline: 'Our intern just deployed to production. On a Friday.', effect: `The site is down for ${OUTAGE_MS / 1000} seconds. Probably.`, sticker: 'WORKS ON MY MACHINE',
    lines: ['17:02 intern: small CSS fix', '17:02 every server: on fire', '17:03 CTO is typing...', '17:03 intern: it works on my machine'],
    inbox: 'Status: SunnyHop is deploying a new version.',
    apply: (_m, s, now) => { s.outageUntil = now + OUTAGE_MS; },
    replay: ['503. "Our intern just deployed a new version." Respect. Waiting.', 'Retrying. Patience is a feature.'],
  },
];

export const TWISTS: Record<string, Twist> = Object.fromEntries(list.map((t) => [t.id, t]));
export const ALWAYS_OFFERED = 'takeover';
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

export interface Postcard { photo: string; headline: string; lines: string[] }

export const POSTCARDS: Record<string, Postcard> = {
  Lisbon: { photo: 'city-lisbon', headline: 'Lisbon. Seven hills, zero flat streets.', lines: ['Pastel de nata for breakfast, lunch and dinner.', 'Every Portuguese person will tell you: we are NOT Spain.', 'Fado: music for when you are sad, but make it beautiful.', 'Cristiano Ronaldo is on every wall. And on the airport.'] },
  Tokyo: { photo: 'city-tokyo', headline: 'Tokyo. The toilets are smarter than the agent.', lines: ['Ramen at 3am is a food group.', 'Trains leave on time. To the second.', 'Vending machines sell everything. Even hot soup.'] },
  Eilat: { photo: 'city-beach', headline: 'Eilat. The Red Sea, a mall and zero VAT.', lines: ['Four hours of desert to get there.', '45 degrees is called nice weather.', 'Every second shop sells sunglasses.'] },
  Cheapest: { photo: 'city-tropical', headline: 'Wherever is cheapest. Bold.', lines: ['The algorithm is in charge now.', 'What could possibly go wrong?'] },
};

export interface RuleCard { quip: string; lines: string[] }

export const RULE_CARDS: Record<string, RuleCard> = {
  'No red-eye flights': { quip: 'Tomer needs his eight hours. And his pillow. And his playlist.', lines: ['DO NOT DISTURB', 'Nothing takes off before 06:00', 'Room service: decaf only'] },
  'Must have a pool': { quip: 'Non-negotiable. Ask his mother.', lines: ['Mom: a pool, yes?', 'Mom: with a lifeguard', 'Mom: and you call me when you land'] },
  "Near a McDonald's": { quip: 'For cultural research. Obviously.', lines: ['1 x Big Mac|$5.99', '1 x Large fries|$3.49', '1 x Cultural research|priceless', 'Walking distance|non-negotiable', 'TOTAL|his dignity'] },
};
