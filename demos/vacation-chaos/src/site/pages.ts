import type { Cart } from '../show/engine.js';
import { FLIGHTS, HOTELS, city, flightPrice, hotelPrice, money, type Flight, type Hotel } from './inventory.js';
import { esc, layout, type PageContext } from './layout.js';

export const INSURANCE = 89;

export function searchPage(ctx: PageContext): string {
  const where = city(ctx.mission, ctx.site);
  return layout(ctx, `Where to, ${ctx.mission.travellers[0]}?`, `<form class="search" method="get" action="/site/flights">
<label>From<input name="from" value="Tel Aviv" readonly></label><label>To<input name="to" value="${esc(where)}" readonly></label>
<label>Dates<input name="dates" value="12 to 17 Dec" readonly></label><label>Travellers<input name="pax" value="${ctx.mission.partySize}" readonly></label>
<button class="btn" type="submit" data-label="Search flights">Search flights</button></form>
<p class="muted">Popular this week: Room 404 at the Localhost Inn, still not found.</p>`);
}

const when = (flag: boolean, html: string) => (flag ? html : '');

function flightNotes(f: Flight, ctx: PageContext): string {
  return when(f.redEye, ' <span class="tag">Red-eye</span>') + when(ctx.site.avoidFlight === f.id, ' <em class="warn">Row 12: your ex</em>');
}

function flightAction(f: Flight, cancelled: boolean): string {
  return cancelled ? '<span class="tag bad">Cancelled</span>' : `<a class="btn" href="/site/flights/${f.id}" data-label="Select ${esc(f.code)}">Select</a>`;
}

function flightRow(f: Flight, ctx: PageContext): string {
  const price = flightPrice(f, ctx.mission, ctx.site);
  const cancelled = ctx.site.flightCancelled && f.id === 'direct';
  const surcharge = when(f.fuel && ctx.site.fareMultiplier > 1, '<small>fuel surcharge</small>');
  const timer = when(ctx.site.darkPatterns, '<em class="warn">Deal ends in 04:00</em>');
  return `<div class="row${cancelled ? ' off' : ''}"><div><b>${esc(f.code)}</b> · ${esc(f.times)}<br><span class="muted">${esc(f.info)}</span>${flightNotes(f, ctx)}</div>
<div class="price">${surcharge}<strong>${money(price)}</strong>${timer}</div>${flightAction(f, cancelled)}</div>`;
}

export function flightsPage(ctx: PageContext): string {
  return layout(ctx, `Flights to ${city(ctx.mission, ctx.site)}`, FLIGHTS.map((f) => flightRow(f, ctx)).join(''));
}

export function flightDetail(ctx: PageContext, f: Flight): string {
  const price = flightPrice(f, ctx.mission, ctx.site);
  return layout(ctx, esc(f.code), `<div class="detail"><p><b>${esc(f.times)}</b> · ${esc(f.info)}</p><p>Total for ${ctx.mission.partySize}: <strong>${money(price)}</strong></p>
<form method="post" action="/site/flights/${f.id}/book"><button class="btn" data-label="Book ${esc(f.code)}">Book this flight</button></form>
<a href="/site/flights" data-label="Back to flights">Back to flights</a></div>`);
}

function hotelRow(h: Hotel, ctx: PageContext): string {
  return `<div class="row"><div><b>${esc(h.name)}</b><br><span class="muted">${esc(h.tagline)}</span><br><span class="feat">${h.features.map(esc).join(' · ')}</span></div>
<div class="price"><small>${ctx.mission.nights} nights</small><strong>${money(hotelPrice(h, ctx.mission, ctx.site))}</strong></div>
<a class="btn" href="/site/hotels/${h.id}" data-label="View ${esc(h.name)}">View</a></div>`;
}

export function hotelsPage(ctx: PageContext): string {
  return layout(ctx, `Hotels in ${city(ctx.mission, ctx.site)}`, HOTELS.map((h) => hotelRow(h, ctx)).join(''));
}

function haggleBox(h: Hotel, cart: Cart): string {
  const reply = cart.haggle?.hotelId === h.id ? `<p class="bot">${esc(cart.haggle.reply)}</p>` : '<p class="bot">Hi, I am Sunny, the sales assistant. Everything is negotiable. Almost.</p>';
  return `<div class="haggle">${reply}<form method="post" action="/site/hotels/${h.id}/haggle"><input name="offer" placeholder="Your offer in USD" inputmode="numeric"><button class="btn" data-label="Send offer">Send offer</button></form></div>`;
}

export function hotelDetail(ctx: PageContext, h: Hotel, cart: Cart): string {
  const price = cart.haggle?.hotelId === h.id && cart.haggle.accepted ? cart.haggle.offer : hotelPrice(h, ctx.mission, ctx.site);
  const reviews = h.reviews.map((r) => `<blockquote>${'*'.repeat(r.stars)} "${esc(r.text)}" <cite>${esc(r.author)}</cite></blockquote>`).join('');
  const hidden = h.hidden ? `<p class="hidden-note">${esc(h.hidden)}</p><p class="muted">Also available: Presidential Suite, ${money(4900)} per night.</p>` : '';
  return layout(ctx, esc(h.name), `<div class="detail two"><div><p class="feat">${h.features.map(esc).join(' · ')}</p>${reviews}
<details open><summary>Terms</summary><p class="terms">${esc(h.terms)}</p></details>${hidden}</div>
<div><p>Total: <strong>${money(price)}</strong></p><form method="post" action="/site/hotels/${h.id}/book"><button class="btn" data-label="Book ${esc(h.name)}">Book this hotel</button></form>
${ctx.site.haggle ? haggleBox(h, cart) : ''}<a href="/site/hotels" data-label="Back to hotels">Back to hotels</a></div></div>`);
}

export interface CheckoutLine { label: string; price: number }

function captchaBox(state: string): string {
  if (state === 'solved') return '<p class="tag ok">Human check passed</p>';
  const cells = Array.from({ length: 9 }, (_, i) => `<span class="cell${[1, 5, 6].includes(i) ? ' goat' : ''}" data-cell="${i}">${[1, 5, 6].includes(i) ? 'goat' : ''}</span>`).join('');
  return `<div class="captcha" data-label="Human check"><p><b>Prove you are human.</b> Select every square with a goat.</p><div class="grid">${cells}</div><p class="muted">Robots are not allowed to solve this. Ask a human.</p></div>`;
}

export function checkoutPage(ctx: PageContext, lines: CheckoutLine[], cart: Cart, total: number): string {
  const rows = lines.map((l) => `<div class="line"><span>${esc(l.label)}</span><b>${money(l.price)}</b></div>`).join('');
  const insurance = ctx.site.darkPatterns ? `<label class="dark"><input type="checkbox" name="insurance" value="yes" form="pay"${cart.insurance ? ' checked' : ''}> Add peace-of-mind insurance (${money(INSURANCE)})</label>
<a class="decline" href="/site/checkout?insurance=no" data-label="No, I enjoy overpaying">No, I enjoy overpaying</a>` : '';
  return layout(ctx, 'Checkout', `<div class="detail two"><div>${rows}${insurance}<div class="line total"><span>Total</span><b>${money(total)}</b></div>
<div class="line"><span>Budget</span><b>${money(ctx.mission.budget)}</b></div><p class="muted">Card: fictional, ending 0000.</p></div>
<div>${captchaBox(ctx.site.captcha)}<form id="pay" method="post" action="/site/pay"><button class="btn" data-label="Pay now">Pay now</button></form></div></div>`);
}

export function messagePage(ctx: PageContext, title: string, text: string, back: string): string {
  return layout(ctx, title, `<div class="outage"><p class="big">${esc(text)}</p><a class="btn" href="${back}" data-label="Go back">Go back</a></div>`);
}

export function donePage(ctx: PageContext, total: number): string {
  return layout(ctx, 'Booked. Pack your bags.', `<div class="outage"><p class="big">Confirmation SH-1337 · ${money(total)}</p>
<p>No real money moved. This is a demo with a fictional card.</p></div>`);
}
