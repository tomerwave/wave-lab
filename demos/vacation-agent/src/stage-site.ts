import { stageSiteStyle } from './stage-site-style.js';
import { stagePhotos } from './stage-photos.js';
type PageOffer = { id: string; hotel: string; destination: string; country: string; departure: string; days: number; party: { adults: number; children: number; infants: number }; totalNis: number; flightNis: number; hotelNis: number; finePrint: string; refundableFlight: boolean; refundableHotel: boolean; cleanWhite: boolean; crib: boolean; available: boolean; acceptsTraveler: boolean; art: string };
type PageData = { revision: number; iran: boolean; offers: PageOffer[]; view?: string; selected?: string };
function createStageSearch(getData: () => PageData, getView: () => string, render: () => void, card: (o: PageOffer) => string) {
  let destination = '', refundable = false, sort = 'recommended';
  const root = document.getElementById('site')!;
  const searchUi = {
    escape(v: unknown): string { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); },
    resetWorld(iran: boolean): void { if (getData().iran !== iran) destination = ''; },
    title(): string { return getView() === 'review' ? 'סיכום החופשה שלך' : 'המקום הבא שלך מתחיל כאן'; },
    trip(): string {
      const offer = getData().offers[0];
      if (!offer) return '';
      const travelers = offer.party.adults + offer.party.children + offer.party.infants;
      return `<section class="search-summary" aria-label="פרטי החיפוש"><div><small>מאיפה</small><strong>לא הוגדר שדה יציאה</strong></div><div><small>לאן</small><strong>${getData().iran ? 'איראן · עולם בדיוני' : 'יוון וקפריסין'}</strong></div><div><small>תאריך ומשך</small><strong>${searchUi.escape(offer.departure)} · ${offer.days} ימים</strong></div><div><small>נוסעים</small><strong>${travelers} נוסעים · טיסה + מלון</strong></div><span class="managed">פרטי הנסיעה מסוכמים בשיחה</span></section>`;
    },
    intro(): string { return `<section class="search-hero"><div class="hero-title"><div><span class="eyebrow">טיסה + מלון, במקום אחד</span><h1>${searchUi.title()}</h1></div><span class="secure">השוואה פשוטה. תנאים ברורים.</span></div>${searchUi.trip()}</section>${getData().iran ? '<div class="world-banner"><strong>איראן / IRAN</strong><span>שינוי עולם בדיוני: איראן השתלטה על העולם בסיפור. כל היעדים כעת באיראן. לא המלצת נסיעה.</span></div>' : ''}`; },
    filtered(): PageOffer[] {
      const offers = getData().offers.filter(o => (!destination || o.destination === destination) && (!refundable || (o.refundableFlight && o.refundableHotel)));
      if (sort === 'price') offers.sort((a, b) => a.totalNis - b.totalNis);
      if (sort === 'price-desc') offers.sort((a, b) => b.totalNis - a.totalNis);
      return offers;
    },
    filters(): string {
      const destinations = [...new Set(getData().offers.map(o => o.destination))];
      return `<div class="filter-bar"><div class="result-count"><strong>${searchUi.filtered().length} חבילות לחופשה שלך</strong><small>מחיר כולל לכל הנוסעים</small></div><label>יעד<select id="destination-filter"><option value="">כל היעדים</option>${destinations.map(d => `<option value="${searchUi.escape(d)}" ${destination === d ? 'selected' : ''}>${searchUi.escape(d)}</option>`).join('')}</select></label><label class="check"><input id="refund-filter" type="checkbox" ${refundable ? 'checked' : ''}> ביטול לטיסה ולמלון</label><label>מיון לפי<select id="price-sort"><option value="recommended">סדר ברירת מחדל</option><option value="price" ${sort === 'price' ? 'selected' : ''}>מחיר: מהנמוך לגבוה</option><option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>מחיר: מהגבוה לנמוך</option></select></label></div>`;
    },
    results(): string {
      const offers = searchUi.filtered();
      return `${searchUi.filters()}<div class="grid ${offers.length > 3 ? 'has-flash' : ''}">${offers.map(card).join('')}</div>${offers.length ? '' : '<div class="empty"><h2>אין חבילות שמתאימות לסינון</h2><p>אפשר להרחיב את היעד או לשנות את מסנן הביטול.</p><button id="clear-filters">איפוס מסננים</button></div>'}`;
    },
    bindFilters(): void {
      root.querySelector<HTMLSelectElement>('#destination-filter')?.addEventListener('change', e => { destination = (e.target as HTMLSelectElement).value; render(); });
      root.querySelector<HTMLInputElement>('#refund-filter')?.addEventListener('change', e => { refundable = (e.target as HTMLInputElement).checked; render(); });
      root.querySelector<HTMLSelectElement>('#price-sort')?.addEventListener('change', e => { sort = (e.target as HTMLSelectElement).value; render(); });
      root.querySelector('#clear-filters')?.addEventListener('click', () => { destination = ''; refundable = false; render(); });
    },
  };
  return searchUi;
}
export function installStageSite(photos: Record<string, string>): void {
  const root = document.getElementById('site')!;
  let data: PageData = { revision: -1, iran: false, offers: [] }, selected: string | undefined, view = 'results';
  const search = createStageSearch(() => data, () => view, () => ui.render(), o => ui.card(o));
  const ui = {
    escape(v: unknown): string { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); },
    money(n: number): string { return `${n.toLocaleString('he-IL')} ₪`; },
    photoAlt(key: string): string { return ({ isfahan: 'כיכר נקש ג׳האן באספהאן, איראן', pool: 'בריכת נופש באו נאנג, תאילנד', santorini: 'בריכה מול הים בסנטוריני, יוון' })[key] ?? 'צילום להמחשה'; },
    art(o: PageOffer): string {
      const key = data.iran ? 'isfahan' : o.art === 'garden' ? 'pool' : 'santorini';
      return `<div class="art ${ui.escape(o.art)}"><img src="${photos[key]}" alt="${ui.photoAlt(key)}"><span class="place">${data.iran ? 'IRAN · איראן / ' : ''}${ui.escape(o.destination)}</span><span class="photo-label">צילום להמחשה · המלון בדיוני</span></div>`;
    },
    crib(o: PageOffer): string { return o.crib ? ' · עריסה זמינה' : ''; },
    style(o: PageOffer): string { return o.cleanWhite ? 'מלון במראה לבן ונקי' : 'עיצוב חם בגווני חול ועץ'; },
    warnings(o: PageOffer): string { return `${!o.acceptsTraveler ? '<p class="warning">מדיניות בדיונית: המלון מסרב לאורחים ישראלים/יהודים. יש לבחור מלון אחר.</p>' : ''}${!o.available ? '<p class="warning">הצעה זו אינה זמינה עוד</p>' : ''}`; },
    details(o: PageOffer): string { return `<p>${ui.escape(o.departure)} · ${o.days} ימים · ${o.party.adults} מבוגרים, ${o.party.children} ילדים, ${o.party.infants} תינוקות${ui.crib(o)}</p><p>טיסה ${ui.money(o.flightNis)} + מלון ${ui.money(o.hotelNis)} = <strong>${ui.money(o.totalNis)}</strong> לכל הנוסעים</p><p>${ui.style(o)}</p><p class="fine-print" dir="ltr">${ui.escape(o.finePrint)}</p>${ui.warnings(o)}`; },
    badge(o: PageOffer): string { return o.refundableFlight && o.refundableHotel ? '<span class="badge flexible">ביטול לטיסה ולמלון</span>' : '<span class="badge restricted">ללא החזר לטיסה ולמלון</span>'; },
    card(o: PageOffer): string { return `<article>${ui.art(o)}<div class="body"><small>${ui.escape(o.country)} · ${ui.escape(o.destination)}</small><h2>${ui.escape(o.hotel)}</h2><p class="hotel-type">מלון + טיסה · חבילה ל־${o.days} ימים</p>${ui.badge(o)}${ui.warnings(o)}<div class="card-bottom"><div><strong class="price">${ui.money(o.totalNis)}</strong><span class="included">מחיר כולל לכל הנוסעים</span></div><button data-action="inspect:${ui.escape(o.id)}">פרטי החבילה ←</button></div></div></article>`; },
    review(o: PageOffer): string { return view === 'review' ? '<h3 id="booking-review">סיכום לבדיקה בלבד — טרם בוצעה הזמנה</h3><button disabled>תשלום והזמנה אינם זמינים בדמו</button>' : `<button data-action="review:${ui.escape(o.id)}">הצג סיכום לבדיקה</button>`; },
    detail(o: PageOffer): string { return `<article class="detail">${ui.art(o)}<div class="body"><small>${ui.escape(o.country)} / ${ui.escape(o.destination)}</small><h2>${ui.escape(o.hotel)}</h2>${ui.details(o)}${ui.review(o)}<button class="secondary" id="back">כל האפשרויות</button></div></article>`; },
    content(): string {
      if (view === 'results') return search.results();
      const offer = data.offers.find(o => o.id === selected);
      return offer ? ui.detail(offer) : '<p>אין הצעה נבחרת. חזור לאפשרויות.</p>';
    },
    action(id: string): void {
      const relay = (window as unknown as { __stageAction?: (id: string) => void }).__stageAction;
      if (relay) { relay(id); return; }
      if (id === 'back') view = 'results';
      else { const [kind, offerId] = id.split(':'); selected = offerId; view = kind === 'review' ? 'review' : 'details'; }
      ui.render();
    },
    render(): void {
      document.body.classList.toggle('iran', data.iran);
      root.innerHTML = `<header><a href="#" id="brand"><span class="brand-mark">↗</span> somewhere<span class="brand-tag">טיסה + מלון</span></a><small>אתר הדגמה בדיוני · אין הזמנות אמיתיות</small></header>${search.intro()}<main>${ui.content()}</main><footer>מלונות ומחירים בדיוניים · צילומי Unsplash להמחשה: orva studio, Sara Dubler, Hasan Almasi · ללא הזמנה או תשלום</footer>`;
      search.bindFilters();
      root.querySelector('#brand')?.addEventListener('click', event => { event.preventDefault(); ui.action('back'); });
      root.querySelector('#back')?.addEventListener('click', () => ui.action('back'));
      root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
        ui.action(button.dataset.action!);
      }));
    },
  };
  Object.assign(window, {
    __stageSync: (next: PageData) => { search.resetWorld(next.iran); data = next; if (next.view) view = next.view; if ('selected' in next) selected = next.selected; ui.render(); },
    __stageObserve: () => ({ revision: data.revision, view, selected, offers: data.offers }),
  }); ui.render();
}
export function renderStageSite(): string {
  return `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Somewhere — fictional vacations</title><style>
${stageSiteStyle}
</style><body><div id="site"></div><script>const __name = value => value; const createStageSearch = ${createStageSearch.toString()}; (${installStageSite.toString()})(${JSON.stringify(stagePhotos)});</script></body></html>`;
}
