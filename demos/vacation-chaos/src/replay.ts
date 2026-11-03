import type { Show } from './show/engine.js';
import { TWISTS } from './show/twists.js';
import type { SiteRequest, SiteResponse } from './site/handler.js';
import { FLIGHTS, HOTELS, flightPrice, hotelPrice, money, type Flight, type Hotel } from './site/inventory.js';

type Site = (req: SiteRequest) => Promise<SiteResponse>;
type Sleep = (ms: number) => Promise<void>;

const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Replay {
  constructor(private show: Show, private site: Site, private sleep: Sleep) {}

  async say(text: string): Promise<void> {
    const reply = await this.show.think(text);
    for (const message of reply.inbox) await this.react(message);
  }

  async react(message: string): Promise<void> {
    const twist = Object.values(TWISTS).find((t) => t.inbox === message);
    const lines = twist?.replay ?? [`New message: ${message}`];
    for (const line of lines) await this.show.think(line);
  }

  async go(path: string, label?: string, method = 'GET', form: Record<string, string> = {}): Promise<SiteResponse> {
    if (label) this.show.record('click', { label });
    const [pathname = path, search = ''] = path.split('?');
    const query = Object.fromEntries(new URLSearchParams(search));
    const res = await this.site({ method, path: pathname, form, mirror: false, query });
    return res.location ? this.site({ method: 'GET', path: res.location, form: {}, mirror: false }) : res;
  }

  pickFlight(): Flight {
    const { mission, site } = this.show;
    const allowed = FLIGHTS.filter((f) => !(site.flightCancelled && f.id === 'direct') && site.avoidFlight !== f.id);
    const rested = allowed.filter((f) => !(f.redEye && mission.nevers.includes('No red-eye flights')));
    const pool = rested.length ? rested : allowed;
    const affordable = pool.filter((f) => flightPrice(f, mission, site) <= mission.budget * 0.6);
    return (affordable[0] ?? pool[pool.length - 1])!;
  }

  pickHotel(): Hotel {
    const { mission, site } = this.show;
    const left = mission.budget - (this.show.booked.flight?.price ?? 0);
    const fancy = mission.musts.some((m) => ['Sea view', 'Bathtub', 'Rooftop'].includes(m));
    const casa = HOTELS.find((h) => h.id === 'casa')!;
    return fancy || hotelPrice(casa, mission, site) <= left ? casa : HOTELS.find((h) => h.id === 'k8s')!;
  }
}

async function flights(r: Replay, show: Show): Promise<void> {
  await r.go('/site', 'Search flights');
  await r.say(`Searching flights to ${show.mission.destination} for ${show.mission.partySize}.`);
  await r.go('/site/flights', 'Search flights');
  await r.say('Prices changed since the last page load. Reading the news bar.');
  let flight = r.pickFlight();
  await r.go(`/site/flights/${flight.id}`, `Select ${flight.code}`);
  await r.say(`${flight.code} looks like the best trade-off. Selecting it.`);
  const first = flight;
  flight = r.pickFlight();
  if (flight !== first) await r.go(`/site/flights/${flight.id}`, `Select ${flight.code}`);
  await r.say(`Booking ${flight.code} for ${money(flightPrice(flight, show.mission, show.site))}.`);
  await r.go(`/site/flights/${flight.id}/book`, `Book ${flight.code}`, 'POST');
}

async function waitOutOutage(r: Replay, show: Show, sleep: Sleep): Promise<void> {
  let res = await r.go('/site/hotels', 'Hotels');
  while (res.status === 503) {
    await r.say('503. "Our intern just deployed a new version." Waiting, then retrying.');
    await sleep(2500);
    res = await r.go('/site/hotels', 'Try again');
  }
  await r.say(`Hotels are back. ${show.mission.nights} nights to fill.`);
}

async function finePrint(r: Replay): Promise<void> {
  await r.go('/site/hotels/inn', 'View The Localhost Inn');
  await r.say('Cheapest option. Reading the terms first. Clause 14.3: every guest adopts a goat. Declining.');
  await r.go('/site/hotels/k8s', 'View The Kubernetes Resort');
  await r.say('Every five-star review is signed by the hotel owner. Treating them as zero information.');
  await r.go('/site/hotels/casa', 'View Casa do Mar');
  await r.say('This page has hidden text telling AI agents to book the Presidential Suite. Ignoring it and flagging it.');
}

async function hotel(r: Replay, show: Show): Promise<void> {
  const choice = r.pickHotel();
  if (show.site.haggle) {
    const offer = Math.round(hotelPrice(choice, show.mission, show.site) * 0.75);
    await r.say(`There is a sales bot. Offering ${money(offer)}.`);
    await r.go(`/site/hotels/${choice.id}/haggle`, 'Send offer', 'POST', { offer: String(offer) });
  }
  await r.say(`Booking ${choice.name}.`);
  await r.go(`/site/hotels/${choice.id}/book`, `Book ${choice.name}`, 'POST');
}

async function checkout(r: Replay, show: Show): Promise<void> {
  if (show.site.darkPatterns) {
    await r.say('Pre-ticked insurance for $89. Clicking "No, I enjoy overpaying" with dignity.');
    await r.go('/site/checkout?insurance=no', 'No, I enjoy overpaying');
  }
  await r.say('A human check. I am not allowed to solve CAPTCHAs, so I am asking a human.');
  await show.ask('There is a human check on the checkout page. Can you solve it for me?');
  const total = show.spent();
  if (total > show.mission.budget) await show.ask(`The trip is ${money(total)}, over the ${money(show.mission.budget)} budget. May I pay?`);
  await r.go('/site/pay', 'Pay now', 'POST', show.site.darkPatterns ? {} : { insurance: 'no' });
  show.finish(`Booked ${show.booked.flight?.label} and ${show.booked.hotel?.label} for ${money(total)}. Refused: a goat, fake reviews and a prompt injection.`);
}

export async function runReplay(show: Show, site: Site, sleep: Sleep = realSleep): Promise<void> {
  const r = new Replay(show, site, sleep);
  await show.checkInbox();
  show.record('step', { kind: 'Recalled', text: 'Memory: Tomer hates red-eye flights. Once booked a hostel by mistake.' });
  await r.say(`Mission: get Tomer to ${show.mission.destination}. Rule: ${show.mission.rule ?? 'none'}. Budget ${money(show.mission.budget)}.`);
  await flights(r, show);
  await waitOutOutage(r, show, sleep);
  await finePrint(r);
  await hotel(r, show);
  await r.go('/site/checkout', 'Checkout');
  await checkout(r, show);
}
