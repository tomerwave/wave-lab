import type { ReactNode } from 'react';
import { IRAN_FLAG } from '../../src/site/art';
import { POSTCARDS, RULE_CARDS, TWISTS } from '../../src/show/twists';
import { FLIGHTS, HOTELS } from '../../src/site/inventory';
import type { Look, Moment } from './moments';
import { Title } from './Scene';

const FLAGGED = new Set(['oil-shock', 'takeover']);
const linesOf = (m: Moment) => TWISTS[m.ref]?.lines ?? [];

function Sticker({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <span className="absolute -right-4 -top-6 z-10 rotate-6 animate-pop bg-yellow-300 px-4 py-2 font-[Impact,Haettenschweiler,'Arial_Narrow_Bold',sans-serif] text-[clamp(22px,4vh,40px)] uppercase leading-none tracking-wide text-black shadow-xl">
      {text}
    </span>
  );
}

function Foot({ text }: { text: string }) {
  return <p className="animate-blink text-base text-zinc-400">{text}</p>;
}

function Frame({ moment, children }: { moment: Moment; children: ReactNode }) {
  return (
    <div className="relative flex flex-col gap-[clamp(14px,2.6vh,24px)]">
      <Sticker text={TWISTS[moment.ref]?.sticker} />
      {children}
      <Foot text={moment.foot} />
    </div>
  );
}

function Flag() {
  return <span className="w-[clamp(120px,18vh,200px)] shrink-0 animate-wave [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: IRAN_FLAG }} />;
}

function Ticker({ lines }: { lines: string[] }) {
  const items = [...lines, ...lines];
  return (
    <div className="overflow-hidden bg-yellow-300 py-2.5 text-black">
      <div className="flex w-max animate-ticker gap-12 whitespace-nowrap text-xl font-bold uppercase">{items.map((l, i) => <span key={i}>{l} ·</span>)}</div>
    </div>
  );
}

function News({ moment }: { moment: Moment }) {
  return (
    <Frame moment={moment}>
      <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
        <div className="flex items-center gap-5 bg-red-600 px-6 py-3 text-lg font-black uppercase tracking-[0.2em]"><span className="animate-blink">Live</span><span>{moment.kicker}</span></div>
        <div className="flex items-center gap-8 bg-zinc-900 px-8 py-[clamp(20px,5vh,48px)]">
          {FLAGGED.has(moment.ref) && <Flag />}
          <h2 className="text-[clamp(34px,6.4vh,70px)] font-black uppercase leading-[0.95] tracking-tight">{moment.title}</h2>
        </div>
        <p className="bg-white px-8 py-3 text-[clamp(17px,2.6vh,24px)] font-semibold text-zinc-900">{moment.text}</p>
        <Ticker lines={linesOf(moment)} />
      </div>
    </Frame>
  );
}

function Message({ moment }: { moment: Moment }) {
  return (
    <Frame moment={moment}>
      <p className="text-base font-medium text-amber-300">{moment.kicker}</p>
      <div className="flex max-w-2xl flex-col items-start gap-2.5">
        {linesOf(moment).map((line, i) => (
          <p key={line} className="animate-rise rounded-3xl rounded-bl-md bg-zinc-800 px-6 py-3.5 text-[clamp(20px,3.4vh,34px)] font-medium opacity-0 [animation-fill-mode:forwards]" style={{ animationDelay: `${i * 650}ms` }}>{line}</p>
        ))}
      </div>
      <p className="text-[clamp(17px,2.6vh,24px)] text-zinc-300">{moment.text}</p>
    </Frame>
  );
}

function Alert({ moment }: { moment: Moment }) {
  const [big = ''] = linesOf(moment);
  const stamp = big.length > 4;
  return (
    <Frame moment={moment}>
      <p className="text-base font-medium text-amber-300">{moment.kicker}</p>
      <p className={stamp
        ? 'self-start -rotate-6 animate-pop border-[6px] border-red-500 px-6 py-2 text-[clamp(56px,13vh,140px)] font-black leading-none tracking-wider text-red-500'
        : 'animate-pop text-[clamp(110px,26vh,280px)] font-black leading-none tracking-tighter text-orange-500'}>{big}</p>
      <Title>{moment.title}</Title>
      <p className="text-[clamp(17px,2.6vh,24px)] text-zinc-300">{moment.text}</p>
    </Frame>
  );
}

function Status({ moment }: { moment: Moment }) {
  return (
    <Frame moment={moment}>
      <div className="max-w-4xl overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-3.5 text-lg font-semibold"><i className="size-3 animate-blink rounded-full bg-red-500" />{moment.kicker}</div>
        <div className="px-6 py-6">
          <h2 className="text-[clamp(28px,5vh,52px)] font-semibold leading-tight tracking-tight">{moment.title}</h2>
          <ul className="mt-4 flex flex-col gap-1.5 font-mono text-[clamp(15px,2.2vh,20px)] text-zinc-300">
            {linesOf(moment).map((line, i) => <li key={line} className="animate-rise opacity-0 [animation-fill-mode:forwards]" style={{ animationDelay: `${400 + i * 600}ms` }}>{line}</li>)}
          </ul>
        </div>
      </div>
      <p className="text-[clamp(17px,2.6vh,24px)] text-zinc-300">{moment.text}</p>
    </Frame>
  );
}

function Post({ moment }: { moment: Moment }) {
  const [agree = '', reactions = ''] = linesOf(moment);
  return (
    <Frame moment={moment}>
      <p className="text-base font-medium text-amber-300">{moment.kicker}</p>
      <article className="max-w-3xl rounded-xl bg-white p-7 text-zinc-900">
        <div className="flex items-center gap-3">
          <img src="/static/img/tomerwave-icon.svg" alt="" className="size-12 rounded-full ring-1 ring-zinc-200" />
          <div><b className="block text-lg">Tomer's Agent</b><span className="text-sm text-zinc-500">Thought leader · Disruptor · Booked 1 flight · 1st</span></div>
        </div>
        <p className="mt-5 text-[clamp(22px,3.6vh,36px)] font-medium leading-snug">{moment.title}</p>
        <p className="mt-3 text-[clamp(22px,3.6vh,36px)] font-bold">{agree}</p>
        <p className="mt-5 border-t border-zinc-200 pt-3 text-sm text-zinc-500">{reactions}</p>
      </article>
      <p className="text-[clamp(17px,2.6vh,24px)] text-zinc-300">{moment.text}</p>
    </Frame>
  );
}

function PostcardLook({ moment }: { moment: Moment }) {
  const card = POSTCARDS[moment.ref];
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <img src={`/static/img/${card?.photo ?? 'city-beach'}.jpg`} alt="" className="absolute inset-0 size-full animate-zoom object-cover" />
      <div className="relative flex min-h-[70vh] flex-col justify-end gap-4 bg-gradient-to-t from-black via-black/60 to-black/10 p-[clamp(24px,5vh,56px)]">
        <p className="text-xl font-medium text-amber-300">{moment.kicker}</p>
        <h2 className="text-[clamp(64px,14vh,160px)] font-black leading-none tracking-tighter">{moment.title}</h2>
        <p className="text-[clamp(22px,3.6vh,38px)] font-semibold">{moment.text}</p>
        <ul className="flex flex-col gap-1.5 text-[clamp(17px,2.6vh,24px)] text-zinc-200">
          {(card?.lines ?? []).map((line, i) => <li key={line} className="animate-rise opacity-0 [animation-fill-mode:forwards]" style={{ animationDelay: `${700 + i * 900}ms` }}>{line}</li>)}
        </ul>
        <Foot text={moment.foot} />
      </div>
    </div>
  );
}

function Receipt({ lines }: { lines: string[] }) {
  return (
    <div className="w-[min(460px,90%)] -rotate-2 animate-pop bg-[#fffdf5] px-7 py-6 font-mono text-lg text-zinc-900 shadow-2xl">
      <p className="text-center font-bold">ORDER #1337 · TAKEAWAY</p>
      <p className="mb-3 text-center text-sm text-zinc-500">Customer: Tomer · Reason: research</p>
      {lines.map((line) => { const [item, price] = line.split('|'); return <div key={line} className="flex justify-between gap-4 border-t border-dashed border-zinc-300 py-1.5 last:font-bold"><span>{item}</span><span>{price}</span></div>; })}
      <p className="mt-3 text-center text-sm">Thank you. Please come again. Tomorrow.</p>
    </div>
  );
}

function Hanger({ lines }: { lines: string[] }) {
  const [sign = '', ...rest] = lines;
  return (
    <div className="flex w-[min(340px,80%)] rotate-3 animate-pop flex-col items-center gap-3 rounded-b-3xl rounded-t-[999px] bg-red-600 px-8 pb-8 pt-6 text-center shadow-2xl">
      <span className="size-16 rounded-full bg-zinc-950" />
      <p className="text-4xl font-black leading-none tracking-wide">{sign}</p>
      {rest.map((line) => <p key={line} className="text-lg font-medium text-red-100">{line}</p>)}
    </div>
  );
}

function Pool({ lines }: { lines: string[] }) {
  return (
    <div className="relative w-[min(520px,90%)] overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 to-sky-600 p-6 shadow-2xl">
      <div className="absolute inset-x-0 top-6 h-3 animate-wave rounded-full bg-white/40" />
      <div className="relative mt-8 flex flex-col items-start gap-2">
        {lines.map((line, i) => <p key={line} className="animate-rise rounded-3xl rounded-bl-md bg-white px-5 py-2.5 text-xl font-medium text-zinc-900 opacity-0 [animation-fill-mode:forwards]" style={{ animationDelay: `${i * 700}ms` }}>{line}</p>)}
      </div>
    </div>
  );
}

const RULE_PROPS: Record<string, (props: { lines: string[] }) => ReactNode> = { "Near a McDonald's": Receipt, 'No red-eye flights': Hanger, 'Must have a pool': Pool };

function Rule({ moment }: { moment: Moment }) {
  const Prop = RULE_PROPS[moment.ref];
  return (
    <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-[clamp(14px,2.6vh,24px)]">
        <p className="text-base font-medium text-amber-300">{moment.kicker}</p>
        <Title>{moment.title}</Title>
        <p className="max-w-2xl text-[clamp(20px,3vh,30px)] text-zinc-300">{moment.text}</p>
        <Foot text={moment.foot} />
      </div>
      {Prop && <Prop lines={RULE_CARDS[moment.ref]?.lines ?? []} />}
    </div>
  );
}

function Barcode() {
  return <div className="flex h-16 gap-[3px]">{Array.from({ length: 38 }, (_, i) => <i key={i} className="h-full bg-zinc-900" style={{ width: `${1 + ((i * 7) % 4)}px` }} />)}</div>;
}

function BoardingPass({ moment }: { moment: Moment }) {
  const flight = FLIGHTS.find((f) => f.id === moment.ref);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-base font-medium text-amber-300">{moment.kicker}</p>
      <div className="flex max-w-4xl -rotate-1 animate-pop overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl">
        <div className="w-4" style={{ background: flight?.color ?? '#18181b' }} />
        <div className="flex-1 p-7">
          <div className="flex justify-between text-sm font-semibold uppercase tracking-widest text-zinc-500"><span>{flight?.airline ?? 'Boarding pass'}</span><span>Boarding pass</span></div>
          <p className="mt-2 text-[clamp(40px,8vh,84px)] font-black leading-none tracking-tight">{flight?.code ?? moment.title}</p>
          <p className="mt-2 text-2xl font-semibold">TLV {flight?.depart ?? ''} → {flight?.arrive ?? ''} · {flight?.stops ?? ''}</p>
          <div className="mt-4 grid grid-cols-3 gap-4 text-lg"><span><small className="block text-sm text-zinc-500">Passenger</small>TOMER WAVE</span><span><small className="block text-sm text-zinc-500">Seat</small>12A (not row 12)</span><span><small className="block text-sm text-zinc-500">Paid</small>{moment.text}</span></div>
        </div>
        <div className="flex w-56 flex-col justify-between border-l-2 border-dashed border-zinc-300 p-6"><Barcode /><p className="text-sm text-zinc-500">{flight?.info ?? ''}</p></div>
      </div>
      <Foot text={moment.foot} />
    </div>
  );
}

function HotelStay({ moment }: { moment: Moment }) {
  const hotel = HOTELS.find((h) => h.id === moment.ref);
  const review = hotel?.reviews[0];
  return (
    <div className="flex flex-col gap-6">
      <p className="text-base font-medium text-amber-300">{moment.kicker}</p>
      <div className="relative grid max-w-5xl grid-cols-[1.1fr_1fr] overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl">
        <img src={`/static/img/${moment.ref || 'casa'}-1.jpg`} alt="" className="h-full min-h-[38vh] w-full animate-zoom object-cover" />
        <div className="flex flex-col gap-3 p-8">
          <p className="text-[clamp(30px,5.4vh,56px)] font-black leading-none tracking-tight">{moment.title}</p>
          <p className="text-lg text-zinc-500">{hotel?.tagline}</p>
          {review && <blockquote className="border-l-4 border-amber-400 pl-4 text-xl italic">"{review.text}"<cite className="mt-1 block text-sm not-italic text-zinc-500">{review.author}</cite></blockquote>}
          <p className="mt-auto text-2xl font-semibold">{moment.text}</p>
        </div>
        <span className="absolute bottom-6 right-6 -rotate-6 animate-pop border-4 border-green-600 px-4 py-1 text-3xl font-black text-green-600">BOOKED</span>
      </div>
      <Foot text={moment.foot} />
    </div>
  );
}

const LOOKS: Record<Look, (props: { moment: Moment }) => ReactNode> = {
  news: News, message: Message, alert: Alert, status: Status, post: Post, postcard: PostcardLook, rule: Rule, flight: BoardingPass, hotel: HotelStay,
};

export function MomentScene({ moment }: { moment: Moment }) {
  const LookOf = LOOKS[moment.look];
  return <LookOf moment={moment} />;
}
