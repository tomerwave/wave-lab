import type { Flight, Hotel } from './inventory.js';

export function hotelPhoto(h: Hotel, cls = 'photo', n = 1): string {
  return `<img class="${cls}" src="/static/img/${h.id}-${n}.jpg" alt="${h.name}" loading="eager">`;
}

export function gallery(h: Hotel): string {
  return `<div class="gallery">${hotelPhoto(h, 'g-main', 1)}<div class="g-side">${hotelPhoto(h, 'g-small', 2)}${hotelPhoto(h, 'g-small', 3)}</div></div>`;
}

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

export const IRAN_FLAG = '<svg class="flag" viewBox="0 0 63 36" aria-label="Flag"><rect width="63" height="12" fill="#239f40"/><rect y="12" width="63" height="12" fill="#fff"/><rect y="24" width="63" height="12" fill="#da0000"/><path d="M31.5 13.5c-2.2 1-3 4.5-.4 7.5m.4-7.5c2.2 1 3 4.5.4 7.5M31.5 13.2v9" stroke="#da0000" stroke-width="1.1" fill="none"/></svg>';

export function mapCard(city: string): string {
  const pins = [[38, 42], [62, 30], [80, 58], [48, 70], [24, 60]].map(([x, y]) => `<circle cx="${x}%" cy="${y}%" r="5" fill="#0062e3" stroke="#fff" stroke-width="2"/>`).join('');
  return `<div class="mapcard"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="100" fill="#e8eef5"/><path d="M0 70 Q30 60 50 75 T100 68 V100 H0Z" fill="#cfe3f5"/><path d="M10 0 L30 100 M60 0 L45 100 M0 35 L100 45 M0 85 L100 20" stroke="#fff" stroke-width="2.2"/>${pins}</svg><span class="btn sm">Show on map · ${city}</span></div>`;
}

export const ICONS = {
  check: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plane: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M2 16l20-6-20-6 3 6-3 6z" fill="currentColor"/></svg>',
  bed: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M3 18V7m0 6h18v5M7 13V10h5a3 3 0 0 1 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>',
  car: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M5 16V11l2-5h10l2 5v5M5 16h14M7 19v-3M17 19v-3M5 11h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  alert: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M12 3 2 20h20L12 3zm0 6v5m0 3v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export const DUCK = '<svg class="duck" viewBox="0 0 40 32" aria-hidden="true"><ellipse cx="18" cy="22" rx="14" ry="9" fill="#facc15"/><circle cx="29" cy="11" r="7" fill="#facc15"/><path d="M35 10 L40 12 L35 14 Z" fill="#f97316"/><circle cx="31" cy="9" r="1.3" fill="#18181b"/><path d="M8 20 q6 4 12 0" stroke="#eab308" stroke-width="2" fill="none"/></svg>';

export const GOAT = '<svg viewBox="0 0 40 32" class="goat-ic" aria-label="goat"><ellipse cx="18" cy="18" rx="11" ry="7" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/><circle cx="31" cy="12" r="4.5" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/><path d="M29 8 l-2-5 M33 8 l2-5" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><path d="M11 24v6M16 24v6M21 24v6M26 24v6" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><path d="M32 16 l1 4" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/></svg>';
