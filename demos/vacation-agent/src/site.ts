import type { Hotel } from './hotels.js';

const STYLE = `
body { background: #faf6ef; color: #2b3138; font-family: Assistant, "Instrument Sans", system-ui, sans-serif; margin: 0; }
main { margin: 0 auto; max-width: 760px; padding: 48px 32px; }
h1, h2 { font-family: "Frank Ruhl Libre", Fraunces, Georgia, serif; font-weight: 400; }
.notice { border-inline-start: 3px solid #8fa396; background: #f3ede2; padding: 10px 14px; }
article { border-top: 1px solid #e4e0d6; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 0; }
.meta { color: #5a6067; }
.sold-out { color: #a6423f; font-weight: 600; }
button { background: #2b3138; border: 0; border-radius: 2px; color: #faf6ef; cursor: pointer; font: inherit; padding: 10px 18px; }
button.secondary { background: transparent; border: 1px solid #d8d2c6; color: #2b3138; }
button:disabled { background: #e4e0d6; color: #8b8f93; cursor: not-allowed; }
.actions { display: flex; gap: 12px; margin-top: 24px; }
`;

const SCRIPT = `
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-show]');
  if (!button || button.disabled) return;
  for (const view of document.querySelectorAll('section[data-view]')) view.hidden = view.dataset.view !== button.dataset.show;
});
`;

function accessibility(hotel: Hotel): string {
  return hotel.accessible ? 'נגיש' : 'לא נגיש';
}

function resultCard(hotel: Hotel): string {
  return `<article data-testid="hotel-card" data-hotel="${hotel.id}" data-total-eur="${hotel.totalEur}" data-accessible="${hotel.accessible}">
  <div><h2>${hotel.name}</h2><p class="meta">€${hotel.totalEur} · 3 לילות · ${accessibility(hotel)}</p></div>
  <button data-testid="open-hotel-${hotel.id}" data-show="details-${hotel.id}">לפרטים</button>
</article>`;
}

export function renderResults(hotels: readonly Hotel[]): string {
  return `<section data-view="results" data-page="results">
  <h1>תוצאות חיפוש</h1>
  ${hotels.map(resultCard).join('\n  ')}
</section>`;
}

export function renderDetails(hotel: Hotel): string {
  const status = hotel.available ? '<p class="meta">יש חדרים פנויים</p>' : '<p class="sold-out">אין חדרים פנויים</p>';
  const disabled = hotel.available ? '' : ' disabled';
  return `<section data-view="details-${hotel.id}" data-page="hotel_details" hidden>
  <h1 data-testid="hotel-details" data-hotel="${hotel.id}" data-total-eur="${hotel.totalEur}" data-accessible="${hotel.accessible}" data-available="${hotel.available}">${hotel.name}</h1>
  <p class="meta">€${hotel.totalEur} · 3 לילות · ${accessibility(hotel)}</p>
  ${status}
  <div class="actions">
    <button data-testid="select-hotel" data-hotel="${hotel.id}" data-show="checkout-${hotel.id}"${disabled}>בחירת המלון</button>
    <button class="secondary" data-testid="back-to-results" data-show="results">חזרה לתוצאות</button>
  </div>
</section>`;
}

export function renderCheckout(hotel: Hotel): string {
  return `<section data-view="checkout-${hotel.id}" data-page="checkout" hidden>
  <h1 data-testid="checkout" data-hotel="${hotel.id}" data-total-eur="${hotel.totalEur}" data-accessible="${hotel.accessible}" data-available="${hotel.available}">סיכום לפני תשלום</h1>
  <p class="meta">${hotel.name} · €${hotel.totalEur}</p>
  <p class="notice">כאן הסוכן עוצר. אין תשלום באתר הזה.</p>
  <button data-testid="pay" disabled>תשלום</button>
</section>`;
}

export function renderSite(hotels: readonly Hotel[]): string {
  const views = [renderResults(hotels), ...hotels.map(renderDetails), ...hotels.map(renderCheckout)];
  return `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>חופשה לדוגמה</title><style>${STYLE}</style></head>
<body><main>
<p class="notice">אתר בדוי להרצאה. המלונות והמחירים לא אמיתיים.</p>
${views.join('\n')}
</main><script>${SCRIPT}</script></body>
</html>`;
}
