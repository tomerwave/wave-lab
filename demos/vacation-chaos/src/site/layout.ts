import type { Mission, SiteMode } from '../show/types.js';
import { DUCK, ICONS, IRAN_FLAG, SEAL, SUN_MARK } from './art.js';
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
  const field = (label: string, icon: string, value: string) => `<div class="field">${icon}<div><span>${label}</span><b>${esc(value)}</b></div></div>`;
  const to = `<label class="field to">${ICONS.pin}<div><span>Where to</span><input name="to" value="${esc(city(ctx.site))}" placeholder="Search a city" autocomplete="off" ${act(`Where to`)}></div></label>`;
  return `<form class="searchbar" action="/site/flights" method="get">${field('From', ICONS.takeoff, 'Tel Aviv (TLV)')}${to}${field('Dates', ICONS.calendar, `Sat 12 Dec · ${m.nights} night${m.nights === 1 ? '' : 's'}`)}${field('Travellers', ICONS.user, `${m.partySize} adult${m.partySize > 1 ? 's' : ''} · Economy`)}<button class="btn search" ${act(`Search`)}>${ICONS.search}Search</button></form>`;
}

function newsBar(site: SiteMode): string {
  return site.news ? `<div class="news" ${act(`News bar`)}><div class="wrap newsrow"><span class="newstag">${ICONS.alert}Travel alert</span><span>${esc(site.news)}</span></div></div>` : '';
}

function band(ctx: PageContext, lead: string): string {
  return `<section class="band${ctx.step === 'search' ? ' tall' : ''}"><div class="wrap"><p class="bandlead">${lead}</p>${searchBar(ctx)}</div></section>`;
}

function normalHeader(ctx: PageContext): string {
  return `<header class="top"><div class="wrap toprow"><a class="logo" href="/site" ${act(`Home`)}>${SUN_MARK}<span>SunnyHop</span></a><nav class="tabs">${tabs(ctx)}</nav>
<div class="navright"><span class="navlink">${ICONS.globe}EN · USD</span><span class="navlink">Help</span><span class="navlink">Trips</span><span class="user"><i>T</i>Tomer</span></div></div></header>
${band(ctx, 'Flights and stays, compared in one place. Prices include taxes.')}`;
}

function takeoverHeader(ctx: PageContext): string {
  return `<div class="tricolor"></div><header class="top"><div class="wrap toprow">${IRAN_FLAG}<a class="logo" href="/site" ${act(`Home`)}><span>PersiaHop</span><small>Under new management · formerly <s>SunnyHop</s></small></a><nav class="tabs">${tabs(ctx)}</nav>
<div class="navright"><span class="navlink">Official travel portal</span><span class="navlink struck">Complaints</span><span class="pill">Log in</span></div></div></header>
<div class="decree"><div class="wrap decreerow">${SEAL}<p><b>Decree No. 1.</b> By order of the new owners, all destinations have been simplified. Please enjoy your trip to Tehran.</p><span class="decree-sign">The Management</span></div></div>
${band(ctx, 'One destination. Zero decisions. Maximum hospitality.')}`;
}

const SKINS = {
  normal: { name: 'SunnyHop', cls: '', header: normalHeader },
  takeover: { name: 'PersiaHop', cls: 'skin-takeover', header: takeoverHeader },
};

function actionIndex(html: string): string {
  const actions = [...html.matchAll(/ id="([^"]+)" data-label="([^"]+)"/g)].map(([, id, label]) => `#${id} (${label})`);
  return `<nav class="sr-only" aria-label="Page actions">Page actions: ${[...new Set(actions)].join(', ')}</nav>`;
}

function footer(name: string): string {
  const col = (title: string, items: string[]) => `<div><b>${title}</b>${items.map((i) => `<span>${i}</span>`).join('')}</div>`;
  return `<footer class="foot"><div class="wrap"><div class="footcols">${col('Company', ['About', 'Careers', 'Press'])}${col('Support', ['Help centre', 'Booking changes', 'Refund policy'])}${col('Discover', ['Flights', 'Hotels', 'Car hire'])}</div>
<div class="footrow"><span>&copy; 2026 ${name} · Fictional demo. No real bookings or payments.</span><span class="egg">Certified: works on my machine</span></div></div></footer>`;
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
<main class="wrap"><div class="pagehead"><h1>${esc(title)}</h1></div>${body}</main>
${footer(name)}${DUCK}</body></html>`;
}

export function outagePage(ctx: PageContext, secondsLeft: number): string {
  return layout(ctx, 'We will be right back', `<div class="card center outage"><div class="status-code">503</div><p class="lead">Our intern just deployed a new version.</p>
<p class="muted">Back in ${secondsLeft} seconds. Please try again then.</p><div class="statuslist"><span><i class="dot ok"></i>Flights</span><span><i class="dot bad"></i>Hotels</span><span><i class="dot ok"></i>Checkout</span><span><i class="dot warn"></i>Intern</span></div><a class="btn" href="/site/hotels" ${act(`Try again`)}>Try again</a></div>`);
}
