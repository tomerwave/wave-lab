import type { Mission, SiteMode } from '../show/types.js';
import { DUCK, ICONS } from './art.js';
import { city } from './inventory.js';

export const esc = (value: unknown) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface PageContext { mission: Mission; site: SiteMode; mirror: boolean; step: 'search' | 'flights' | 'hotels' | 'checkout' | 'done' }

function brand(site: SiteMode): { name: string; tagline: string } {
  if (site.skin === 'takeover') return { name: 'PersiaHop', tagline: 'Under new management' };
  return { name: 'SunnyHop', tagline: '' };
}

function tabs(ctx: PageContext): string {
  const items: Array<[string, string, PageContext['step'][]]> = [
    ['Flights', ICONS.plane, ['search', 'flights']], ['Stays', ICONS.bed, ['hotels']], ['Checkout', ICONS.check, ['checkout', 'done']],
  ];
  return items.map(([label, icon, steps]) => `<span class="tab${steps.includes(ctx.step) ? ' on' : ''}">${icon}${label}</span>`).join('');
}

function searchBar(ctx: PageContext): string {
  const m = ctx.mission;
  const field = (label: string, value: string) => `<div class="field"><span>${label}</span><b>${esc(value)}</b></div>`;
  return `<div class="searchbar">${field('From', 'Tel Aviv (TLV)')}${field('To', city(m, ctx.site))}${field('Dates', `12 Dec · ${m.nights} night${m.nights === 1 ? '' : 's'}`)}${field('Travellers', `${m.partySize} adult${m.partySize > 1 ? 's' : ''} · Economy`)}<a class="btn search" href="/site/flights" data-label="Search">Search</a></div>`;
}

function newsBar(site: SiteMode): string {
  return site.news ? `<div class="news" data-label="News bar">${ICONS.alert}<span>${esc(site.news)}</span></div>` : '';
}

export function layout(ctx: PageContext, title: string, body: string): string {
  const b = brand(ctx.site);
  const skin = ctx.site.skin === 'takeover' ? 'skin-takeover' : '';
  const script = ctx.mirror ? '/static/mirror.js' : '/static/beacon.js';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${b.name}</title><link rel="stylesheet" href="/static/site.css"><script src="${script}" defer></script></head>
<body class="${skin}${ctx.mirror ? ' mirror' : ''}"><header class="nav"><div class="wrap navrow"><a class="logo" href="/site" data-label="Home"><span class="sun"></span>${b.name}${b.tagline ? `<small>${b.tagline}</small>` : ''}</a>
<nav class="tabs">${tabs(ctx)}</nav><div class="navright"><span>USD</span><span>Help</span><span class="pill">Sign in</span></div></div>
<div class="wrap">${searchBar(ctx)}</div></header>${newsBar(ctx.site)}
<main class="wrap"><h1>${esc(title)}</h1>${body}</main>
<footer class="wrap foot"><span>&copy; 2026 ${b.name} · Fictional demo. No real bookings or payments.</span><span class="egg">Certified: works on my machine</span></footer>${DUCK}</body></html>`;
}

export function outagePage(ctx: PageContext, secondsLeft: number): string {
  return layout(ctx, 'We will be right back', `<div class="panel center"><div class="status-code">503</div><p class="lead">Our intern just deployed a new version.</p>
<p class="muted">Back in ${secondsLeft} seconds. Please try again then.</p><a class="btn" href="/site/hotels" data-label="Try again">Try again</a></div>`);
}
