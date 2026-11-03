import type { Flight, Hotel } from './inventory.js';

export function hotelPhoto(h: Hotel, cls = 'photo'): string {
  const [sky, sun, sea] = h.palette;
  const id = `g-${h.id}-${cls}`;
  const windows = Array.from({ length: 12 }, (_, i) => `<rect x="${118 + (i % 4) * 18}" y="${70 + Math.floor(i / 4) * 22}" width="9" height="12" rx="1.5" fill="#fff" opacity=".75"/>`).join('');
  return `<svg class="${cls}" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#fff7ed"/></linearGradient></defs>
<rect width="320" height="200" fill="url(#${id})"/><circle cx="250" cy="58" r="26" fill="${sun}" opacity=".85"/>
<path d="M0 150 Q80 135 160 150 T320 148 V200 H0Z" fill="${sea}" opacity=".9"/><path d="M0 168 Q90 156 170 170 T320 166 V200 H0Z" fill="${sea}"/>
<rect x="106" y="56" width="92" height="96" rx="4" fill="#f8fafc"/><rect x="106" y="56" width="92" height="8" rx="3" fill="${sun}"/>${windows}
<rect x="40" y="96" width="44" height="56" rx="3" fill="#e2e8f0"/><rect x="214" y="104" width="38" height="48" rx="3" fill="#e2e8f0"/></svg>`;
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
