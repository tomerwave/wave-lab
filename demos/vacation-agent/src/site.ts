import type { Hotel } from './hotels.js';
import { SITE_STYLE } from './site-style.js';

const SCRIPT = `
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-show]');
  if (!button || button.disabled) return;
  for (const view of document.querySelectorAll('section[data-view]')) view.hidden = view.dataset.view !== button.dataset.show;
  window.scrollTo({top:0,behavior:'smooth'});
});
`;

function accessibility(hotel: Hotel): string {
  return hotel.accessible ? 'נגיש' : 'לא נגיש';
}

const PHOTOS: Record<string, string> = { A: 'photo-1566073771259-6a8506099945', B: 'photo-1582719478250-c89cae4dc85b', C: 'photo-1571896349842-33c89424de2d' };

function illustration(hotel: Hotel, extra = ''): string {
  return `<img class="art ${extra}" src="https://images.unsplash.com/${PHOTOS[hotel.id]}?w=1000&q=80" alt="תמונת אווירה עבור ${hotel.name}">`;
}

function resultCard(hotel: Hotel): string {
  return `<article data-testid="hotel-card" data-hotel="${hotel.id}" data-total-eur="${hotel.totalEur}" data-accessible="${hotel.accessible}">
  ${illustration(hotel)}<div class="card-content"><p class="eyebrow">★★★★ · החוף הים תיכוני</p><h2>${hotel.name}</h2><p class="meta">מלון בוטיק · 3 לילות · ${accessibility(hotel)}</p><span class="rating">9.${hotel.id === 'B' ? '1' : '4'}</span><span class="review"> מצוין · 128 חוות דעת</span><br><span class="tag">${hotel.accessible ? 'גישה נוחה לכל החדרים' : 'חדרים בקומות ללא מעלית'}</span><p class="${hotel.available ? 'meta' : 'sold-out'}" data-availability-label data-hotel="${hotel.id}">${hotel.available ? 'יש חדרים פנויים' : 'אין חדרים פנויים'}</p>
  <div class="card-bottom"><div class="price">€${hotel.totalEur}<small>סה״כ לשהייה</small></div><button data-testid="open-hotel-${hotel.id}" data-show="details-${hotel.id}">לפרטים</button></div></div>
</article>`;
}

export function renderResults(hotels: readonly Hotel[]): string {
  return `<section data-view="results" data-page="results">
  <div class="intro"><div><p class="eyebrow">A LITTLE TIME AWAY</p><h1>יש מקום לחופשה.</h1></div><p>בוקר איטי, קפה טוב, וים שלא צריך להסביר.<br>בחרו את הפינה שלכם לשלושת הלילות הבאים.</p></div>
  <div class="search"><span><small>לאן נוסעים</small>החוף הים תיכוני</span><span><small>משך השהייה</small>3 לילות</span><span><small>נוסעים</small>2 מבוגרים</span></div>
  <p class="results-count">${hotels.length} מקומות קטנים ששווה להכיר</p><div class="cards">${hotels.map(resultCard).join('\n')}</div>
</section>`;
}

export function renderDetails(hotel: Hotel): string {
  const status = hotel.available ? '<p class="meta">יש חדרים פנויים</p>' : '<p class="sold-out">אין חדרים פנויים</p>';
  const disabled = hotel.available ? '' : ' disabled';
  return `<section data-view="details-${hotel.id}" data-page="hotel_details" hidden>
  <p class="eyebrow">החוף הים תיכוני · מלון בוטיק</p><h1 data-testid="hotel-details" data-hotel="${hotel.id}" data-total-eur="${hotel.totalEur}" data-accessible="${hotel.accessible}" data-available="${hotel.available}">${hotel.name}</h1>
  <div class="details"><div>${illustration(hotel, 'detail-art')}<h2>פשוט להרגיש בחופש.</h2><p class="description">מקום קטן עם אור גדול. חדרים נעימים, ארוחת בוקר מקומית וטיול קצר אל החוף. כאן אפשר לפתוח ספר, להזמין עוד קפה, ולא להספיק שום דבר.</p><div class="amenities"><span>ארוחת בוקר</span><span>קרוב לחוף</span><span>Wi-Fi</span><span>${accessibility(hotel)}</span></div></div>
  <div class="booking-box"><p class="price">€${hotel.totalEur}</p><p class="meta">3 לילות · 2 מבוגרים · ${accessibility(hotel)}</p>
  ${status}
  <div class="actions"><button data-testid="select-hotel" data-hotel="${hotel.id}" data-show="checkout-${hotel.id}"${disabled}>בחירת המלון</button><button class="secondary" data-testid="back-to-results" data-show="results">חזרה לתוצאות</button></div></div></div>
</section>`;
}

export function renderCheckout(hotel: Hotel): string {
  return `<section data-view="checkout-${hotel.id}" data-page="checkout" hidden>
  <p class="eyebrow">כמעט בחופשה</p><h1 data-testid="checkout" data-hotel="${hotel.id}" data-total-eur="${hotel.totalEur}" data-accessible="${hotel.accessible}" data-available="${hotel.available}">סיכום לפני תשלום</h1>
  <div class="checkout-box"><h2>${hotel.name}</h2><div class="receipt"><span>משך השהייה</span><strong>3 לילות</strong></div><div class="receipt"><span>נגישות</span><strong>${accessibility(hotel)}</strong></div><div class="receipt"><span>סה״כ לשהייה</span><strong dir="ltr">€${hotel.totalEur}</strong></div>
  <p class="notice">אתר הדגמה בדוי. אין אפשרות להזמין או לשלם באתר הזה.</p><div class="actions"><button data-testid="pay" disabled>תשלום</button><button class="secondary" data-testid="back-to-results" data-show="results">חזרה לתוצאות</button></div></div>
</section>`;
}

export function renderSite(hotels: readonly Hotel[]): string {
  const views = [renderResults(hotels), ...hotels.map(renderDetails), ...hotels.map(renderCheckout)];
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Somewhere · מקום לחופשה</title><style>${SITE_STYLE}</style></head>
<body><header><div class="nav"><div class="brand" dir="ltr">somewhere<span>.</span></div><small>מקומות קטנים. חופשות גדולות.</small></div></header><main>${views.join('\n')}</main><footer><span dir="ltr">somewhere. · Photos: Unsplash</span><span>אתר הדגמה בדוי · המלונות והמחירים אינם אמיתיים · אין תשלום</span></footer><script>${SCRIPT}</script></body></html>`;
}
