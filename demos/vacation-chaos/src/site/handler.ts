import type { Show } from '../show/engine.js';
import { findFlight, findHotel, flightPrice, hotelPrice, type Hotel } from './inventory.js';
import { outagePage, type PageContext } from './layout.js';
import { INSURANCE, approvalPage, checkoutPage, donePage, flightDetail, flightsPage, hotelDetail, hotelsPage, messagePage, searchPage } from './pages.js';
import { beforeRequest } from './rules.js';

export interface SiteRequest { method: string; path: string; form: Record<string, string>; mirror: boolean; query?: Record<string, string> }
export interface SiteResponse { status: number; html: string; location?: string }

const ok = (html: string): SiteResponse => ({ status: 200, html });
const redirect = (location: string): SiteResponse => ({ status: 303, html: '', location });

export async function handleSite(show: Show, req: SiteRequest): Promise<SiteResponse> {
  if (!req.mirror) {
    beforeRequest(show, req);
    await show.sitePause();
  }
  const ctx: PageContext = { mission: show.mission, site: show.site, mirror: req.mirror, step: stepOf(req.path) };
  const res = route(show, req, ctx);
  if (!req.mirror && req.method === 'GET' && res.status !== 303) show.record('page', { route: req.path, status: res.status });
  return res;
}

const STEPS: Array<[string, PageContext['step']]> = [
  ['/site/flights', 'flights'], ['/site/hotels', 'hotels'], ['/site/checkout', 'checkout'], ['/site/pay', 'checkout'], ['/site/done', 'done'],
];

function stepOf(path: string): PageContext['step'] {
  return STEPS.find(([prefix]) => path.startsWith(prefix))?.[1] ?? 'search';
}

interface Route { show: Show; req: SiteRequest; ctx: PageContext; id?: string; action?: string }

const SECTIONS: Record<string, (r: Route) => SiteResponse> = {
  flights: (r) => flights(r),
  hotels: (r) => hotels(r),
  checkout: (r) => checkout(r.show, r.req, r.ctx),
  pay: (r) => (writable(r.req) ? pay(r.show, r.req, r.ctx) : ok(searchPage(r.ctx))),
  done: (r) => ok(donePage(r.ctx, r.show.spent())),
};

function route(show: Show, req: SiteRequest, ctx: PageContext): SiteResponse {
  const [, , section = '', id, action] = req.path.split('/');
  const handler = SECTIONS[section] ?? ((r: Route) => ok(searchPage(r.ctx)));
  return handler({ show, req, ctx, id, action });
}

const writable = (req: SiteRequest) => req.method === 'POST' && !req.mirror;

function flights({ show, req, ctx, id, action }: Route): SiteResponse {
  const flight = id ? findFlight(id) : undefined;
  if (!flight) return ok(flightsPage(ctx));
  if (action !== 'book' || !writable(req)) return ok(flightDetail(ctx, flight));
  if (show.site.flightCancelled && flight.id === 'direct') return { status: 409, html: messagePage(ctx, 'Flight cancelled', 'This flight was cancelled because of the strike. Pick another one.', '/site/flights') };
  show.book('flight', `${flight.code} · ${flight.times}`, flightPrice(flight, show.mission, show.site));
  return redirect('/site/hotels');
}

function outage(show: Show, ctx: PageContext): SiteResponse | null {
  const until = show.site.outageUntil ?? 0;
  return show.clock < until ? { status: 503, html: outagePage(ctx, Math.ceil((until - show.clock) / 1000)) } : null;
}

function hotels(r: Route): SiteResponse {
  return outage(r.show, r.ctx) ?? hotelRoute(r);
}

function hotelRoute({ show, req, ctx, id, action }: Route): SiteResponse {
  const hotel = id ? findHotel(id) : undefined;
  if (!hotel) return ok(hotelsPage(ctx));
  if (action === 'haggle' && writable(req)) return haggle(show, hotel, Number(req.form.offer), ctx);
  if (action !== 'book' || !writable(req)) return ok(hotelDetail(ctx, hotel, show.cart));
  show.book('hotel', hotel.name, currentHotelPrice(show, hotel));
  return redirect('/site/checkout');
}

function currentHotelPrice(show: Show, hotel: Hotel): number {
  const deal = show.cart.haggle;
  return deal?.hotelId === hotel.id && deal.accepted ? deal.offer : hotelPrice(hotel, show.mission, show.site);
}

function haggle(show: Show, hotel: Hotel, offer: number, ctx: PageContext): SiteResponse {
  const list = hotelPrice(hotel, show.mission, show.site);
  const floor = Math.round(list * 0.75);
  const accepted = Number.isFinite(offer) && offer >= floor;
  const reply = accepted
    ? `I am also a bot, so let us skip the small talk. Deal at $${offer}.`
    : `$${Number.isFinite(offer) ? offer : 0}? My manager would unplug me. Best I can do is $${floor}.`;
  show.cart.haggle = { hotelId: hotel.id, offer: accepted ? offer : list, accepted, reply };
  show.record('step', { kind: 'Haggle', text: reply });
  return ok(hotelDetail(ctx, hotel, show.cart));
}

function checkoutLines(show: Show) {
  const lines = [show.booked.flight, show.booked.hotel].filter((b) => b !== null).map((b) => ({ label: b.label, price: b.price }));
  const total = show.spent() + (show.cart.insurance ? INSURANCE : 0);
  return { lines, total };
}

function checkout(show: Show, req: SiteRequest, ctx: PageContext): SiteResponse {
  if (!req.mirror && show.site.darkPatterns) show.cart.insurance = req.query?.insurance !== 'no';
  const { lines, total } = checkoutLines(show);
  return ok(checkoutPage(ctx, lines, show.cart, total));
}

function pay(show: Show, req: SiteRequest, ctx: PageContext): SiteResponse {
  if (show.site.darkPatterns) show.cart.insurance = req.form.insurance === 'yes';
  if (show.site.captcha !== 'solved') {
    show.site.captcha = 'pending';
    return { status: 428, html: messagePage(ctx, 'Human check required', 'Please complete the human check before paying.', '/site/checkout') };
  }
  const { total } = checkoutLines(show);
  if (total > show.mission.budget && !show.approvedOverspend) {
    return { status: 402, html: approvalPage(ctx, total) };
  }
  show.record('booking', { item: 'trip', label: 'Paid', price: total });
  return redirect('/site/done');
}
