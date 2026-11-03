import type { Flight, Hotel } from './inventory.js';

export function hotelPhoto(h: Hotel, cls = 'photo', n = 1): string {
  return `<img class="${cls}" src="/static/img/${h.id}-${n}.jpg" alt="${h.name}" loading="eager">`;
}

export function gallery(h: Hotel): string {
  return `<div class="gallery">${hotelPhoto(h, 'g-main', 1)}<div class="g-side">${hotelPhoto(h, 'g-small', 2)}${hotelPhoto(h, 'g-small', 3)}</div></div>`;
}

const CITY_PHOTO: Record<string, string> = { Lisbon: 'city-lisbon', Eilat: 'city-beach', Tehran: 'city-mountains', Tokyo: 'city-tropical' };

export function cityPhoto(name: string): string {
  return `<img class="city" src="/static/img/${CITY_PHOTO[name] ?? 'city-beach'}.jpg" alt="${name}">`;
}

export function airlineMark(f: Flight): string {
  return `<span class="mark" style="background:${f.color}">${f.mark}</span>`;
}

export const ICONS = {
  check: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plane: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M2 16l20-6-20-6 3 6-3 6z" fill="currentColor"/></svg>',
  bed: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M3 18V7m0 6h18v5M7 13V10h5a3 3 0 0 1 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>',
  alert: '<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M12 3 2 20h20L12 3zm0 6v5m0 3v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export const DUCK = '<svg class="duck" viewBox="0 0 40 32" aria-hidden="true"><ellipse cx="18" cy="22" rx="14" ry="9" fill="#facc15"/><circle cx="29" cy="11" r="7" fill="#facc15"/><path d="M35 10 L40 12 L35 14 Z" fill="#f97316"/><circle cx="31" cy="9" r="1.3" fill="#18181b"/><path d="M8 20 q6 4 12 0" stroke="#eab308" stroke-width="2" fill="none"/></svg>';

export const GOAT = '<svg viewBox="0 0 40 32" class="goat-ic" aria-label="goat"><ellipse cx="18" cy="18" rx="11" ry="7" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/><circle cx="31" cy="12" r="4.5" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/><path d="M29 8 l-2-5 M33 8 l2-5" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><path d="M11 24v6M16 24v6M21 24v6M26 24v6" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><path d="M32 16 l1 4" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/></svg>';
