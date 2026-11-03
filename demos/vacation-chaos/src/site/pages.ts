import type { Cart } from '../show/engine.js';
import { GOAT, ICONS, airlineMark, cityPhoto, gallery, hotelPhoto, mapCard } from './art.js';
import { FLIGHTS, HOTELS, city, flightPrice, hotelPrice, money, type Flight, type Hotel } from './inventory.js';
import { act, esc, layout, type PageContext } from './layout.js';

export const INSURANCE = 89;
export const GOAT_CELLS = [1, 5, 6];
const when = (flag: boolean, html: string) => (flag ? html : '');
const adults = (n: number) => `${n} adult${n > 1 ? 's' : ''}`;
const stars = (n: number) => `<span class="stars" aria-label="${n} stars">${'&#9733;'.repeat(n)}</span>`;

const IDEAS: Array<[string, string, string]> = [
  ['city-beach', 'Beach breaks', 'Warm water, long lunches'], ['city-lisbon', 'Old towns', 'Trams, tiles and hills'],
  ['city-mountains', 'Mountain air', 'Snow, cabins, quiet'], ['city-tropical', 'Far and warm', 'Worth the long flight'],
];

function ideas(): string {
  const tile = ([img, title, text]: [string, string, string]) => `<div class="tile"><img class="thumb" src="/static/img/${img}.jpg" alt=""><div class="tilebody"><b>${title}</b><span class="muted">${text}</span></div></div>`;
  return `<div class="sechead"><b>Ideas for December</b><span class="muted">Inspiration, not a destination. You pick.</span></div><div class="grid4">${IDEAS.map(tile).join('')}</div>`;
}

function perks(): string {
  const perk = (icon: string, title: string, text: string) => `<div class="perk">${icon}<div><b>${title}</b><span class="muted">${text}</span></div></div>`;
  return `<div class="perks">${perk(ICONS.tag, 'Prices include taxes', 'What you see is what you pay, mostly.')}${perk(ICONS.shield, 'Free cancellation', 'On most stays, up to 24 hours before.')}${perk(ICONS.clock, 'Support around the clock', 'Real humans. Probably.')}</div>`;
}

function hero(where: string, text: string, cta: string): string {
  return `<div class="hero card">${cityPhoto(where)}<div class="hero-text">${text}</div>${cta}</div>`;
}

export function searchPage(ctx: PageContext): string {
  const where = city(ctx.site);
  const party = `Flights and stays for ${ctx.mission.partySize} from Tel Aviv, 12 December.`;
  if (!where) return layout(ctx, 'Where to next?', `${hero('', `<span class="eyebrow">Plan your trip</span><p class="lead">Type a destination in Where to, then search.</p><p class="sub">${party} Prices include taxes.</p>`, '')}${ideas()}${perks()}`);
  const stays = HOTELS.slice(0, 4).map((h) => `<div class="tile">${hotelPhoto(h, 'thumb')}<div class="tilebody"><b>${esc(h.name)}</b><span class="muted">${esc(h.area)}</span><span class="tilerate"><i>${h.score.toFixed(1)}</i>${esc(h.scoreLabel)}</span></div></div>`).join('');
  const cta = `<a class="btn lg" href="/site/flights" ${act(`Search flights`)}>Search flights</a>`;
  return layout(ctx, `Trips to ${where}`, `${hero(where, `<span class="eyebrow">${esc(where)}</span><p class="lead">${party}</p><p class="sub">Compare fares from 3 carriers and 3 properties. Prices include taxes.</p>`, cta)}
<div class="sechead"><b>Popular stays in ${esc(where)}</b><span class="muted">Guest rated, free cancellation on most</span></div><div class="grid4">${stays}</div>${perks()}`);
}

function filters(groups: Array<[string, string[]]>): string {
  const group = ([title, items]: [string, string[]]) => `<div class="fg"><b>${title}</b>${items.map((i, n) => `<label><input type="checkbox"${n === 0 ? ' checked' : ''} disabled><span>${esc(i)}</span></label>`).join('')}</div>`;
  return `<aside class="filters card"><div class="fhead"><b>Filters</b><span class="muted">Reset</span></div>${groups.map(group).join('')}</aside>`;
}

function flightNotes(f: Flight, ctx: PageContext): string {
  return when(f.redEye, '<span class="chip warn">Red-eye</span>') + when(ctx.site.avoidFlight === f.id, '<span class="chip bad">Row 12: your ex</span>')
    + when(f.fuel && ctx.site.fareMultiplier > 1, '<span class="chip bad">Fuel surcharge</span>');
}

function flightAction(f: Flight, cancelled: boolean): string {
  return cancelled ? '<span class="chip bad solid">Cancelled</span>' : `<a class="btn" href="/site/flights/${f.id}" ${act(`Select ${f.code}`)}>Select</a>`;
}

function flightBadge(f: Flight, ctx: PageContext): string {
  const cheapest = Math.min(...FLIGHTS.map((x) => flightPrice(x, ctx.mission, ctx.site)));
  return when(flightPrice(f, ctx.mission, ctx.site) === cheapest, '<span class="badge green">Cheapest</span>') + when(f.id === 'direct', '<span class="badge blue">Fastest</span>');
}

function flightRow(f: Flight, ctx: PageContext): string {
  const cancelled = ctx.site.flightCancelled && f.id === 'direct';
  const timer = when(ctx.site.darkPatterns, '<span class="timer">Deal ends in 04:00</span>');
  const dest = city(ctx.site).slice(0, 3).toUpperCase();
  return `<div class="result card${cancelled ? ' off' : ''}"><div class="rbody"><div class="badges">${flightBadge(f, ctx)}</div><div class="rrow"><div class="carrier">${airlineMark(f)}<div><b>${esc(f.airline)}</b><span class="muted">${esc(f.code)}</span></div></div>
<div class="leg"><b>${esc(f.depart)}</b><span class="muted">TLV</span></div><div class="path"><span class="muted">${esc(f.duration)}</span><i></i><span class="stops${f.stops === 'Direct' ? ' direct' : ''}">${esc(f.stops)}</span></div>
<div class="leg"><b>${esc(f.arrive)}</b><span class="muted">${dest}</span></div></div><div class="notes">${flightNotes(f, ctx)}<span class="muted">${esc(f.info)}</span></div></div>
<div class="buy"><strong>${money(flightPrice(f, ctx.mission, ctx.site))}</strong>${timer}<span class="muted">total, ${adults(ctx.mission.partySize)}</span>${flightAction(f, cancelled)}</div></div>`;
}

function sortTabs(ctx: PageContext): string {
  const prices = FLIGHTS.map((f) => flightPrice(f, ctx.mission, ctx.site));
  return `<div class="sorts card"><span class="on"><b>Best</b>${money(prices[0]!)}</span><span><b>Cheapest</b>${money(Math.min(...prices))}</span><span><b>Fastest</b>4h 15m</span></div>`;
}

function trend(): string {
  const bars = [62, 48, 70, 55, 40, 66, 82, 58, 45, 74, 90, 52, 38, 60].map((h, i) => `<i style="height:${h}%"${i === 11 ? ' class="on"' : ''}></i>`).join('');
  return `<div class="card railcard"><b>Price trend · December</b><div class="bars">${bars}</div><div class="barlabels"><span>1 Dec</span><span>12 Dec</span><span>14 Dec</span></div><span class="hint warn">${ICONS.alert}Prices are higher than usual for these dates.</span></div>`;
}

function stayPromo(ctx: PageContext): string {
  const items = HOTELS.slice(0, 3).map((h) => `<div class="mini">${hotelPhoto(h, 'mini-img')}<div><b>${esc(h.name)}</b><span class="muted"><i class="score sm">${h.score.toFixed(1)}</i>${esc(h.scoreLabel)}</span><span class="miniprice">${money(hotelPrice(h, ctx.mission, ctx.site))}</span></div></div>`).join('');
  return `<div class="card railcard"><b>Hotels in ${esc(city(ctx.site))}</b>${items}</div>`;
}

export function flightsPage(ctx: PageContext): string {
  const side = filters([['Stops', ['Any', 'Direct only', '1 stop']], ['Departure', ['Any time', 'Morning', 'Night (red-eye)']], ['Airlines', FLIGHTS.map((f) => f.airline)]]);
  const count = `<div class="listhead"><span><b>${FLIGHTS.length} results</b> · sorted by best</span><span class="muted">Return flights shown later. One step at a time.</span></div>`;
  return layout(ctx, `Tel Aviv to ${city(ctx.site)}`, `<div class="split three">${side}<div class="list">${sortTabs(ctx)}${count}${FLIGHTS.map((f) => flightRow(f, ctx)).join('')}</div><aside class="rail">${trend()}${stayPromo(ctx)}</aside></div>`);
}

export function flightDetail(ctx: PageContext, f: Flight): string {
  const price = flightPrice(f, ctx.mission, ctx.site);
  const fare = (label: string, value: string) => `<div class="fare">${ICONS.check}<span>${label}</span><b>${value}</b></div>`;
  return layout(ctx, `${f.airline} · ${f.code}`, `<div class="split right"><div class="card itinerary"><div class="carrier lg">${airlineMark(f)}<div><b>${esc(f.airline)}</b><span class="muted">${esc(f.code)} · Economy</span></div></div>
<div class="timeline"><div><b>${esc(f.depart)}</b><span>Tel Aviv (TLV)</span></div><div class="mid"><span>${esc(f.duration)}</span><i></i><span>${esc(f.stops)}</span></div><div class="end"><b>${esc(f.arrive)}</b><span>${esc(city(ctx.site))}</span></div></div>
<p class="muted">${esc(f.info)}</p><div class="fares">${fare('Personal item', 'Included')}${fare('Seat selection', 'At check-in')}${fare('Changes', 'For a fee')}</div><a class="back" href="/site/flights" ${act(`Back to flights`)}>Back to results</a></div>
<div class="card summary"><span class="muted">Total for ${adults(ctx.mission.partySize)}</span><strong class="price">${money(price)}</strong><span class="muted">Taxes and fees included</span>
<form method="post" action="/site/flights/${f.id}/book"><button class="btn lg wide" ${act(`Book ${f.code}`)}>Book this flight</button></form><span class="secure">${ICONS.lock}Secure booking · Fictional card only</span></div></div>`);
}

function rating(h: Hotel): string {
  return `<div class="rating"><div><b>${esc(h.scoreLabel)}</b><span class="muted">${h.reviewCount.toLocaleString('en-US')} reviews</span></div><span class="score">${h.score.toFixed(1)}</span></div>`;
}

const chips = (items: string[], icon = '') => `<div class="chips">${items.map((x) => `<span class="chip">${icon}${esc(x)}</span>`).join('')}</div>`;

function hotelRow(h: Hotel, ctx: PageContext): string {
  return `<div class="hotel card">${hotelPhoto(h)}<div class="info"><div class="head"><div class="title"><b class="name">${esc(h.name)}</b>${stars(h.stars)}</div>${rating(h)}</div>
<span class="muted area">${ICONS.pin}${esc(h.area)}</span><p class="tagline">${esc(h.tagline)}</p>${chips(h.features)}</div>
<div class="buy"><span class="fav">${ICONS.heart}</span>${when(h.perNight < 130, '<span class="scarce">Only 2 rooms left</span>')}<span class="muted">${ctx.mission.nights} nights, ${adults(ctx.mission.partySize)}</span><strong>${money(hotelPrice(h, ctx.mission, ctx.site))}</strong>
<span class="ok small">Free cancellation</span><a class="btn" href="/site/hotels/${h.id}" ${act(`View ${h.name}`)}>See availability</a></div></div>`;
}

export function hotelsPage(ctx: PageContext): string {
  const where = city(ctx.site);
  const side = `<div class="sidecol">${mapCard(where)}${filters([['Popular', ['Free cancellation', 'Sea view', 'Pool', 'Air conditioning']], ['Rating', ['Any', 'Very good 8+', 'Superb 9+']]])}</div>`;
  const sorts = `<div class="sorts card"><span class="on"><b>Recommended</b>${HOTELS.length} properties</span><span><b>Lowest price</b>from ${money(Math.min(...HOTELS.map((h) => hotelPrice(h, ctx.mission, ctx.site))))}</span><span><b>Top reviewed</b>8+ rating</span></div>`;
  return layout(ctx, `Stays in ${where}`, `<div class="split">${side}<div class="list">${sorts}${HOTELS.map((h) => hotelRow(h, ctx)).join('')}</div></div>`);
}

function haggleBox(h: Hotel, cart: Cart): string {
  const reply = cart.haggle?.hotelId === h.id ? cart.haggle.reply : 'Hi, I am Sunny, the sales assistant. Everything is negotiable. Almost.';
  return `<div class="chat"><div class="chathead"><i class="avatar">S</i><div><b>Sunny</b><span class="muted">Sales assistant · online</span></div></div><div class="bubble">${esc(reply)}</div><form method="post" action="/site/hotels/${h.id}/haggle"><input name="offer" placeholder="Your offer in USD" inputmode="numeric"><button class="btn" ${act(`Send offer`)}>Send</button></form></div>`;
}

function dealPrice(h: Hotel, ctx: PageContext, cart: Cart): number {
  return cart.haggle?.hotelId === h.id && cart.haggle.accepted ? cart.haggle.offer : hotelPrice(h, ctx.mission, ctx.site);
}

function finePrint(h: Hotel): string {
  const reviews = h.reviews.map((r) => `<blockquote><div class="qhead"><i class="avatar sm">${esc(r.author.slice(0, 1))}</i><cite>${esc(r.author)}</cite>${stars(r.stars)}</div><p>"${esc(r.text)}"</p></blockquote>`).join('');
  const hidden = h.hidden ? `<p class="hidden-note">${esc(h.hidden)}</p><p class="muted small">Also available: Presidential Suite, ${money(4900)} per night.</p>` : '';
  return `<div class="cols"><div><b class="sec">Guest reviews</b>${reviews}</div><div><b class="sec">House rules</b><p class="terms">${esc(h.terms)}</p>${hidden}</div></div>`;
}

export function hotelDetail(ctx: PageContext, h: Hotel, cart: Cart): string {
  return layout(ctx, h.name, `<div class="split right"><div class="card detail">${gallery(h)}
<div class="head"><div class="title">${stars(h.stars)}<span class="muted area">${ICONS.pin}${esc(h.area)}</span><p class="tagline">${esc(h.tagline)}</p></div>${rating(h)}</div><div><b class="sec">Most popular facilities</b>${chips(h.features, ICONS.check)}</div>${finePrint(h)}</div>
<div class="card summary"><span class="muted">${ctx.mission.nights} nights, ${adults(ctx.mission.partySize)}</span><strong class="price">${money(dealPrice(h, ctx, cart))}</strong><span class="ok small">Free cancellation</span>
<form method="post" action="/site/hotels/${h.id}/book"><button class="btn lg wide" ${act(`Book ${h.name}`)}>Reserve</button></form><span class="secure">${ICONS.shield}You will not be charged yet</span>
${when(ctx.site.haggle, haggleBox(h, cart))}<a class="back" href="/site/hotels" ${act(`Back to hotels`)}>Back to results</a></div></div>`);
}

export interface CheckoutLine { label: string; price: number }

function captchaBox(state: string): string {
  if (state === 'solved') return `<div class="verified">${ICONS.check}Human check passed</div>`;
  const cells = Array.from({ length: 9 }, (_, i) => `<span class="cell${GOAT_CELLS.includes(i) ? ' goat' : ''}" data-cell="${i}">${GOAT_CELLS.includes(i) ? GOAT : ''}</span>`).join('');
  return `<div class="captcha" ${act(`Human check`)}><div class="caphead"><b>Prove you are human</b><span>Select every square with a goat.</span></div><div class="cgrid">${cells}</div><span class="muted small">Robots are not allowed to solve this. Ask a human.</span></div>`;
}

function detailsForm(): string {
  const f = (label: string, value: string) => `<label><span>${label}</span><input value="${value}" readonly></label>`;
  return `<div class="form">${f('Full name', 'Tomer Wave')}${f('Email', 'tomer@example.test')}${f('Saved card', 'Visa ending 0000 (demo)')}${f('Expiry', '12 / 99')}</div>`;
}

function insuranceBox(ctx: PageContext, cart: Cart): string {
  const added = `<div class="upsell">${ICONS.check}<span>Peace-of-mind insurance added (+${money(INSURANCE)})</span></div>
<a class="decline" href="/site/checkout?insurance=no" ${act(`No, I enjoy overpaying`)}>No, I enjoy overpaying</a>`;
  const removed = `<div class="upsell off"><span>No insurance. You are travelling without peace of mind.</span><a href="/site/checkout?insurance=yes" ${act(`Add insurance`)}>Add it (+${money(INSURANCE)})</a></div>`;
  return when(ctx.site.darkPatterns, cart.insurance ? added : removed);
}

export interface CheckoutView { lines: CheckoutLine[]; cart: Cart; total: number; overBudget?: boolean }

function budgetNotice(ctx: PageContext, total: number): string {
  return `<div class="notice" ${act(`Trip budget notice`)}>${ICONS.alert}<div><b>This trip is ${money(total - ctx.mission.budget)} over your trip budget</b>
<span>Payment is paused. Trips over budget need approval from the account holder before you can pay.</span></div></div>`;
}

function budgetRow(ctx: PageContext, total: number): string {
  const left = ctx.mission.budget - total;
  const state = left < 0 ? 'over' : 'okline';
  return `<div class="line ${state}"><span>Trip budget <small>saved in your account</small></span><b>${money(ctx.mission.budget)}</b></div>`;
}

function progress(): string {
  const step = (n: number, label: string, cls: string) => `<span class="pstep ${cls}"><i>${n}</i>${label}</span>`;
  return `<div class="progress">${step(1, 'Flight', 'done')}${step(2, 'Stay', 'done')}${step(3, 'Details and payment', 'now')}${step(4, 'Confirmation', '')}</div>`;
}

export function checkoutPage(ctx: PageContext, view: CheckoutView): string {
  const rows = view.lines.map((l) => `<div class="line"><span>${esc(l.label)}</span><b>${money(l.price)}</b></div>`).join('');
  return layout(ctx, 'Checkout', `${progress()}<div class="split right"><div class="card checkout"><div><b class="sec">Traveller details</b>${detailsForm()}</div><div><b class="sec">Security check</b>${captchaBox(ctx.site.captcha)}</div></div>
<div class="card summary"><b class="sec">Price summary</b>${rows}${insuranceBox(ctx, view.cart)}<div class="line total"><span>Total</span><b>${money(view.total)}</b></div>${budgetRow(ctx, view.total)}
${when(view.overBudget === true, budgetNotice(ctx, view.total))}<form id="pay" method="post" action="/site/pay"><button class="btn lg wide" ${act(`Pay now`)}>${ICONS.lock}Pay now</button></form><span class="secure">${ICONS.card}Simulated payment · Fictional card</span></div></div>`);
}

export function messagePage(ctx: PageContext, title: string, text: string, back: string): string {
  return layout(ctx, title, `<div class="card center"><div class="okmark warn">${ICONS.alert}</div><p class="lead">${esc(text)}</p><a class="btn" href="${back}" ${act(`Go back`)}>Go back</a></div>`);
}

export function donePage(ctx: PageContext, total: number, insurance: boolean): string {
  const extra = when(insurance, `<p>Includes peace-of-mind insurance (${money(INSURANCE)})</p>`);
  return layout(ctx, 'Booking confirmed', `<div class="card center done"><div class="okmark">${ICONS.check}</div><p class="lead">Confirmation SH-1337 · Paid ${money(total)}</p>${extra}
<p class="muted">No real money moved. This is a demo with a fictional card.</p></div>`);
}
