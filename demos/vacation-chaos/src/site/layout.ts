import type { Mission, SiteMode } from '../show/types.js';
import { city } from './inventory.js';

export const esc = (value: unknown) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface PageContext { mission: Mission; site: SiteMode; mirror: boolean; step: 'search' | 'flights' | 'hotels' | 'checkout' | 'done' }

const DUCK = '<svg class="duck" viewBox="0 0 30 22" aria-hidden="true"><ellipse cx="14" cy="14" rx="11" ry="7" fill="#e8c547"/><circle cx="22" cy="7" r="5" fill="#e8c547"/><path d="M26 7 L30 8 L26 9 Z" fill="#d9822b"/><circle cx="23" cy="6" r="1" fill="#2b3138"/></svg>';

function brand(site: SiteMode): { name: string; tagline: string } {
  if (site.skin === 'takeover') return { name: 'PersiaHop', tagline: 'Under new management. All destinations have been simplified.' };
  return { name: 'SunnyHop', tagline: 'Flights, hotels and questionable decisions' };
}

function steps(ctx: PageContext): string {
  const all = ['search', 'flights', 'hotels', 'checkout', 'done'] as const;
  const names = { search: 'Search', flights: 'Flights', hotels: 'Hotels', checkout: 'Checkout', done: 'Done' };
  return all.map((s) => `<span class="${s === ctx.step ? 'on' : ''}">${names[s]}</span>`).join('');
}

function newsBar(site: SiteMode): string {
  return site.news ? `<div class="news" data-label="News bar">${esc(site.news)}</div>` : '';
}

export function layout(ctx: PageContext, title: string, body: string): string {
  const b = brand(ctx.site);
  const skin = ctx.site.skin === 'takeover' ? 'skin-takeover' : '';
  const beacon = ctx.mirror ? '<script src="/static/mirror.js" defer></script>' : '<script src="/static/beacon.js" defer></script>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${b.name}</title><link rel="stylesheet" href="/static/site.css">${beacon}</head>
<body class="${skin}${ctx.mirror ? ' mirror' : ''}"><header><div class="brand">${b.name}<small>${esc(b.tagline)}</small></div>
<nav class="steps">${steps(ctx)}</nav><div class="trip">${esc(city(ctx.mission, ctx.site))} · ${ctx.mission.partySize} traveller${ctx.mission.partySize > 1 ? 's' : ''} · ${ctx.mission.nights} nights</div></header>
${newsBar(ctx.site)}<main><h1>${esc(title)}</h1>${body}</main>
<footer><span>Certified: works on my machine</span><span>Fictional site. No real bookings. No real money.</span></footer>${DUCK}</body></html>`;
}

export function outagePage(ctx: PageContext, secondsLeft: number): string {
  return layout(ctx, '503 · Be right back', `<div class="outage"><p class="big">Our intern just deployed a new version.</p>
<p>Back in ${secondsLeft} seconds. Please try again then.</p><p class="muted">Deployed on a Friday. We are aware.</p>
<a class="btn" href="/site/hotels" data-label="Try again">Try again</a></div>`);
}
