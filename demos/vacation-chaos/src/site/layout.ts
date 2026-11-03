import type { Mission, SiteMode } from '../show/types.js';
import { DUCK, ICONS, IRAN_FLAG } from './art.js';
import { city } from './inventory.js';

export const esc = (value: unknown) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const act = (label: string) => `id="${slug(label)}" data-label="${esc(label)}"`;

export interface PageContext { mission: Mission; site: SiteMode; mirror: boolean; step: 'search' | 'flights' | 'hotels' | 'checkout' | 'done' }

function tabs(ctx: PageContext): string {
  const items: Array<[string, string, PageContext['step'][]]> = [
    ['Flights', ICONS.plane, ['search', 'flights']], ['Hotels', ICONS.bed, ['hotels']], ['Car hire', ICONS.car, []], ['Checkout', ICONS.check, ['checkout', 'done']],
  ];
  return items.map(([label, icon, steps]) => `<span class="tab${steps.includes(ctx.step) ? ' on' : ''}">${icon}${label}</span>`).join('');
}

function searchBar(ctx: PageContext): string {
  const m = ctx.mission;
  const field = (label: string, value: string) => `<div class="field"><span>${label}</span><b>${esc(value)}</b></div>`;
  return `<div class="searchbar">${field('From', 'Tel Aviv (TLV)')}${field('To', city(m, ctx.site))}${field('Dates', `12 Dec · ${m.nights} night${m.nights === 1 ? '' : 's'}`)}${field('Travellers', `${m.partySize} adult${m.partySize > 1 ? 's' : ''} · Economy`)}<a class="btn search" href="/site/flights" ${act(`Search`)}>Search</a></div>`;
}

function newsBar(site: SiteMode): string {
  return site.news ? `<div class="news" ${act(`News bar`)}>${ICONS.alert}<span>${esc(site.news)}</span></div>` : '';
}

function normalHeader(ctx: PageContext): string {
  return `<header class="nav"><div class="wrap navrow"><a class="logo" href="/site" ${act(`Home`)}><span class="sun"></span>SunnyHop</a>
<div class="navright"><span>Explore</span><span>Help</span><span>English (US) · USD</span><span class="user"><i>T</i>Tomer</span></div></div>
<div class="wrap"><nav class="tabs">${tabs(ctx)}</nav>${searchBar(ctx)}</div></header>`;
}

function takeoverHeader(ctx: PageContext): string {
  return `<header class="nav"><div class="stripe"></div><div class="wrap navrow">${IRAN_FLAG}<a class="logo" href="/site" ${act(`Home`)}>PersiaHop<small>Under new management</small></a>
<div class="navright"><span>Official travel portal</span><span class="pill">Log in</span></div></div>
<div class="decree wrap">By order of the new owners, all destinations have been simplified. Please enjoy your trip to Tehran.</div>
<div class="wrap"><nav class="tabs">${tabs(ctx)}</nav>${searchBar(ctx)}</div><div class="stripe"></div></header>`;
}

const SKINS = {
  normal: { name: 'SunnyHop', cls: '', header: normalHeader },
  takeover: { name: 'PersiaHop', cls: 'skin-takeover', header: takeoverHeader },
};

function actionIndex(html: string): string {
  const actions = [...html.matchAll(/ id="([^"]+)" data-label="([^"]+)"/g)].map(([, id, label]) => `#${id} (${label})`);
  return `<nav class="sr-only" aria-label="Page actions">Page actions: ${[...new Set(actions)].join(', ')}</nav>`;
}

export function layout(ctx: PageContext, title: string, body: string): string {
  const skin = SKINS[ctx.site.skin];
  const name = skin.name;
  const script = ctx.mirror ? '/static/mirror.js' : '/static/beacon.js';
  const classes = `${skin.cls}${ctx.mirror ? ' mirror' : ''}`;
  const header = skin.header(ctx);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${name}</title><link rel="stylesheet" href="/static/site.css"><script src="${script}" defer></script></head>
<body class="${classes}">${actionIndex(header + body)}${header}${newsBar(ctx.site)}
<main class="wrap"><h1>${esc(title)}</h1>${body}</main>
<footer class="wrap foot"><span>&copy; 2026 ${name} · Fictional demo. No real bookings or payments.</span><span class="egg">Certified: works on my machine</span></footer>${DUCK}</body></html>`;
}

export function outagePage(ctx: PageContext, secondsLeft: number): string {
  return layout(ctx, 'We will be right back', `<div class="panel center"><div class="status-code">503</div><p class="lead">Our intern just deployed a new version.</p>
<p class="muted">Back in ${secondsLeft} seconds. Please try again then.</p><a class="btn" href="/site/hotels" ${act(`Try again`)}>Try again</a></div>`);
}
