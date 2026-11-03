import type { Flight, Hotel } from './inventory.js';

export function hotelPhoto(h: Hotel, cls = 'photo', n = 1): string {
  return `<img class="${cls}" src="/static/img/${h.id}-${n}.jpg" alt="${h.name}" loading="eager">`;
}

export function gallery(h: Hotel): string {
  return `<div class="gallery">${hotelPhoto(h, 'g-main', 1)}${hotelPhoto(h, 'g-small', 2)}${hotelPhoto(h, 'g-small', 3)}<span class="g-more">${ICONS_PHOTO}Show all 24 photos</span></div>`;
}

const ICONS_PHOTO = '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/></g></svg>';

const CITY_PHOTO: Record<string, string> = { Lisbon: 'city-lisbon', Eilat: 'city-beach', Tehran: 'city-mountains', Tokyo: 'city-tokyo' };

export function cityPhoto(name: string): string {
  return `<img class="city" src="/static/img/${CITY_PHOTO[name] ?? 'city-beach'}.jpg" alt="${name}">`;
}

const GLYPHS: Record<string, string> = {
  sun: '<circle cx="16" cy="16" r="6" fill="#fff"/><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l2.8 2.8M21.7 21.7l2.8 2.8M7.5 24.5l2.8-2.8M21.7 10.3l2.8-2.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  arc: '<path d="M6 22c4-10 16-14 20-12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="10" r="2.5" fill="#fde68a"/>',
  globe: '<circle cx="16" cy="16" r="9" stroke="#fff" stroke-width="2" fill="none"/><path d="M7 16h18M16 7c-4 5-4 13 0 18M16 7c4 5 4 13 0 18" stroke="#fff" stroke-width="1.6" fill="none"/>',
  teapot: '<path d="M9 13h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" fill="#fff"/><path d="M21 15c4 0 4 5 0 5M9 15l-3-2M14 10h2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  wing: '<path d="M5 20 27 8l-6 14-5-4-4 5z" fill="#fff"/>',
  leaf: '<path d="M8 24C8 13 15 7 26 7c0 11-6 17-17 17z" fill="#fff"/><path d="M9 23 20 12" stroke="currentColor" stroke-width="1.6"/>',
};

export function airlineMark(f: Flight): string {
  return `<svg class="mark" viewBox="0 0 32 32" style="color:${f.color}" aria-label="${f.airline}"><rect width="32" height="32" rx="8" fill="${f.color}"/>${GLYPHS[f.logo] ?? ''}</svg>`;
}

export const SEAL = '<svg class="seal" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="32" r="23" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2.6"/><path d="M32 14l4.2 9.2 10 1.1-7.5 6.8 2.1 9.9-8.8-5-8.8 5 2.1-9.9-7.5-6.8 10-1.1z" fill="currentColor"/><path d="M18 48h28" stroke="currentColor" stroke-width="2"/></svg>';

export const IRAN_FLAG = '<svg class="flag" viewBox="0 0 63 36" aria-label="Flag"><rect width="63" height="12" fill="#239f40"/><rect y="12" width="63" height="12" fill="#fff"/><rect y="24" width="63" height="12" fill="#da0000"/><path d="M31.5 13.5c-2.2 1-3 4.5-.4 7.5m.4-7.5c2.2 1 3 4.5.4 7.5M31.5 13.2v9" stroke="#da0000" stroke-width="1.1" fill="none"/></svg>';

export function mapCard(city: string): string {
  const pins = [[38, 42], [62, 30], [80, 58], [48, 70], [24, 60]].map(([x, y]) => `<circle class="pin" cx="${x}" cy="${y}" r="2.6"/>`).join('');
  return `<div class="mapcard"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect class="land" width="100" height="100"/><path class="sea" d="M0 72 Q30 60 50 76 T100 66 V100 H0Z"/><path class="park" d="M58 8h22v18H58z"/><path class="road" d="M10 0 L30 100 M60 0 L45 100 M0 35 L100 45 M0 85 L100 20"/>${pins}</svg><span class="btn sm light">Show on map · ${city}</span></div>`;
}

const icon = (body: string, fill = false) => `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true">${fill ? body : `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>`}</svg>`;

export const ICONS = {
  check: icon('<path d="M20 6 9 17l-5-5"/>'),
  plane: icon('<path d="M21 15.5v-1.8l-8-5V3.5a1.5 1.5 0 0 0-3 0v5.2l-8 5v1.8l8-2.5v5.2l-2.2 1.6V21l3.7-1 3.7 1v-1.2L13 18.2V13z" fill="currentColor"/>', true),
  bed: icon('<path d="M3 19V6m0 8h18v5M3 14V11h7v3M10 14v-2.5A1.5 1.5 0 0 1 11.5 10H18a3 3 0 0 1 3 3v1"/>'),
  pin: icon('<path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
  car: icon('<path d="M5 16v-4l2-5h10l2 5v4M4 16h16M7 19v-3M17 19v-3M5 12h14"/>'),
  heart: icon('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  lock: icon('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  alert: icon('<path d="M12 3 2 20h20L12 3zM12 9v5M12 17v.5"/>'),
  calendar: icon('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  user: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  search: icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  takeoff: icon('<path d="M3 20h18M4 13l3.5 2.5L19 10a1.8 1.8 0 0 0-1.8-3L13 9 7 6.5 5.5 7.4l3.8 3.2-3 1.5-1.6-1z"/>'),
  shield: icon('<path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  tag: icon('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
  globe: icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3.5-3 14.5 0 18M12 3c3 3.5 3 14.5 0 18"/>'),
  card: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>'),
};

export const SUN_MARK = '<svg class="sunmark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="currentColor"/><circle cx="16" cy="17" r="6" fill="#ffd166"/><path d="M5 24c4-3 7-3 11 0s7 3 11 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';

export const DUCK = '<svg class="duck" viewBox="0 0 40 32" aria-hidden="true"><ellipse cx="18" cy="22" rx="14" ry="9" fill="#facc15"/><circle cx="29" cy="11" r="7" fill="#facc15"/><path d="M35 10 L40 12 L35 14 Z" fill="#f97316"/><circle cx="31" cy="9" r="1.3" fill="#18181b"/><path d="M8 20 q6 4 12 0" stroke="#eab308" stroke-width="2" fill="none"/></svg>';

export const GOAT = '<svg viewBox="0 0 40 32" class="goat-ic" aria-label="goat"><ellipse cx="18" cy="18" rx="11" ry="7" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/><circle cx="31" cy="12" r="4.5" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/><path d="M29 8 l-2-5 M33 8 l2-5" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><path d="M11 24v6M16 24v6M21 24v6M26 24v6" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><path d="M32 16 l1 4" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/></svg>';
