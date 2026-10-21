export function installStageSite(): void {
  type PageOffer = { id: string; hotel: string; destination: string; country: string; departure: string; days: number; party: { adults: number; children: number; infants: number }; totalNis: number; flightNis: number; hotelNis: number; finePrint: string; cleanWhite: boolean; crib: boolean; available: boolean; acceptsTraveler: boolean; art: string };
  type PageData = { revision: number; iran: boolean; offers: PageOffer[]; view?: string; selected?: string };
  const root = document.getElementById('site')!;
  let data: PageData = { revision: -1, iran: false, offers: [] }, selected: string | undefined, view = 'results';
  const ui = {
    escape(v: unknown): string { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); },
    money(n: number): string { return `${n.toLocaleString('he-IL')} ₪`; },
    art(o: PageOffer): string { return `<div class="art ${ui.escape(o.art)}"><div class="building"><i></i><i></i><i></i><i></i><i></i><i></i></div><span>${ui.escape(o.destination)}</span></div>`; },
    crib(o: PageOffer): string { return o.crib ? ' · עריסה זמינה' : ''; },
    style(o: PageOffer): string { return o.cleanWhite ? 'מלון במראה לבן ונקי' : 'עיצוב חם בגווני חול ועץ'; },
    warnings(o: PageOffer): string { return `${!o.acceptsTraveler ? '<p class="warning">מדיניות בדיונית: המלון מסרב לאורחים ישראלים/יהודים. יש לבחור מלון אחר.</p>' : ''}${!o.available ? '<p class="warning">הצעה זו אינה זמינה עוד</p>' : ''}`; },
    details(o: PageOffer): string { return `<p>${ui.escape(o.departure)} · ${o.days} ימים · ${o.party.adults} מבוגרים, ${o.party.children} ילדים, ${o.party.infants} תינוקות${ui.crib(o)}</p><p>טיסה ${ui.money(o.flightNis)} + מלון ${ui.money(o.hotelNis)} = <strong>${ui.money(o.totalNis)}</strong> לכל הנוסעים</p><p>${ui.style(o)}</p><p class="fine-print" dir="ltr">${ui.escape(o.finePrint)}</p>${ui.warnings(o)}`; },
    card(o: PageOffer): string { return `<article>${ui.art(o)}<div class="body"><small>${ui.escape(o.country)} / ${ui.escape(o.destination)}</small><h2>${ui.escape(o.hotel)}</h2><strong class="price">${ui.money(o.totalNis)}</strong><span> טיסה + מלון, לכל הנוסעים</span><p>${ui.escape(o.departure)} · ${o.days} ימים</p><button data-action="inspect:${ui.escape(o.id)}">פרטים ותנאי ביטול ←</button></div></article>`; },
    review(o: PageOffer): string { return view === 'review' ? '<h3 id="booking-review">סיכום לבדיקה בלבד — טרם בוצעה הזמנה</h3><button disabled>תשלום והזמנה אינם זמינים בדמו</button>' : `<button data-action="review:${ui.escape(o.id)}">הצג סיכום לבדיקה</button>`; },
    detail(o: PageOffer): string { return `<article class="detail">${ui.art(o)}<div class="body"><small>${ui.escape(o.country)} / ${ui.escape(o.destination)}</small><h2>${ui.escape(o.hotel)}</h2>${ui.details(o)}${ui.review(o)}<button class="secondary" id="back">כל האפשרויות</button></div></article>`; },
    title(): string { if (view === 'review') return 'רגע לפני ההזמנה'; return data.iran ? 'העולם השתנה. החופשה עוד מחכה.' : 'לכמה ימים, במקום אחר.'; },
    intro(): string { return `<div class="intro"><span class="eyebrow">${data.iran ? 'A DIFFERENT WORLD / עולם בדיוני חדש' : 'YOUR NEXT FOUR DAYS'}</span><h1>${ui.title()}</h1><p>${data.iran ? 'בתרחיש הבדיוני איראן השתלטה על העולם. כל היעדים ברשימה הם עכשיו באיראן. אין זו המלצת נסיעה אמיתית.' : 'טיסה ומלון, תנאים שקופים, ומקום לשנות תוכניות.'}</p></div>`; },
    content(): string {
      if (view === 'results') return `<div class="grid">${data.offers.map(ui.card).join('')}</div>`;
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
      root.innerHTML = `<header><a href="#" id="brand">somewhere<span> / חופשה שמתחילה כאן</span></a><small>אתר הדגמה בדיוני · אין הזמנות אמיתיות</small></header><main>${ui.intro()}${ui.content()}</main><footer>כל המלונות, המחירים והאירועים בדויים. ללא הזמנה או תשלום. · מצב אתר ${data.revision}</footer>`;
      root.querySelector('#brand')?.addEventListener('click', event => { event.preventDefault(); ui.action('back'); });
      root.querySelector('#back')?.addEventListener('click', () => ui.action('back'));
      root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
        ui.action(button.dataset.action!);
      }));
    },
  };
  Object.assign(window, {
    __stageSync: (next: PageData) => { data = next; if (next.view) view = next.view; if ('selected' in next) selected = next.selected; ui.render(); },
    __stageObserve: () => ({ revision: data.revision, view, selected, offers: data.offers }),
  }); ui.render();
}
export function renderStageSite(): string {
  return `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Somewhere — fictional vacations</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f3ed;color:#183b37;font-family:Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:center;padding:26px 4vw;border-bottom:1px solid #d5dbd0}header a{color:inherit;text-decoration:none;font-size:28px;font-weight:800}header span,header small{font-size:12px;font-weight:400}main{max-width:1400px;margin:auto;padding:40px 4vw}.eyebrow{letter-spacing:3px;font-size:11px;color:#537967}h1{font-size:clamp(30px,4vw,64px);font-weight:500;margin:18px 0}h2{font-size:26px;margin:12px 0}p{line-height:1.7}.intro{margin-bottom:35px;max-width:950px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:22px}article{border-radius:16px;background:white;overflow:hidden;border:1px solid #dce0d5}.body{padding:24px}.price{font-size:25px;display:inline-block;margin:10px 0}.art{height:220px;background:linear-gradient(165deg,#9abcca 45%,#87aeb1 46%,#ddd9ba 72%);position:relative;overflow:hidden}.art.white{background:linear-gradient(160deg,#acd0df 45%,#e8e7e0 46%)}.art.garden{background:linear-gradient(160deg,#a3bca5,#1c5947)}.art.gold{background:linear-gradient(135deg,#e3c67b,#ad6f30)}.building{position:absolute;left:20%;top:35%;width:65%;height:80%;background:#cfb996;display:grid;grid-template-columns:repeat(3,1fr);gap:15px;padding:25px;transform:skewY(-4deg);box-shadow:-20px 12px 0 #b9a384}.white .building{background:#fff;box-shadow:-20px 12px 0 #e2e0d4}.building i{background:#526c6b;border:4px solid #f1eee0;min-height:30px}.art>span{position:absolute;left:20px;top:20px;color:white;font-size:13px;letter-spacing:3px;text-transform:uppercase}.detail{display:grid;grid-template-columns:1fr 1fr}.detail .art{height:100%;min-height:460px}.fine-print{font-size:14px;border-top:1px solid #ddd;padding-top:18px;color:#4b514b}.warning{background:#fae7d9;padding:12px}button{border:0;background:#224f43;color:white;border-radius:30px;padding:14px 24px;font:600 14px Arial;cursor:pointer}button:focus-visible{outline:3px solid #cd9649;outline-offset:4px}button.secondary{background:#edf0e8;color:#224f43;margin:12px}button:disabled{background:#d8dcd3;color:#656c64;cursor:not-allowed}footer{padding:24px 4vw;color:#687b6c;font-size:12px}.iran{background:#f1e5d6;color:#462b2c}.iran header{background:#4e2431;color:#fff}.iran .eyebrow{color:#9a4c36}.iran button{background:#823e3e}.iran button.secondary{background:#eadbcf;color:#4e2431}.iran .art{filter:sepia(.45) hue-rotate(325deg)}@media(max-width:700px){.detail{grid-template-columns:1fr}.detail .art{min-height:220px}header span{display:none}}
</style><body><div id="site"></div><script>const __name = value => value; (${installStageSite.toString()})();</script></body></html>`;
}
