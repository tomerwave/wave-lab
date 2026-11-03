import type { ReactNode } from 'react';
import type { ActiveVote, Snapshot } from '../../src/show/engine';
import { AskScene } from './Ask';
import { Kicker, Primary, Secondary, Title } from './Scene';
import type { Moment } from './moments';
import { act, isPresenter, start } from './presenter';
import { bookings, money, spent } from './format';
import { meta, voteHost } from './show';

const BUDGETS = [1200, 2400, 5000];

function Lead({ children }: { children: ReactNode }) {
  return <p className="max-w-3xl text-[clamp(17px,2.6vh,24px)] leading-snug text-zinc-500">{children}</p>;
}

function Qr({ big = false }: { big?: boolean }) {
  return <img src="/qr.svg" alt="QR code to vote" className={big ? 'size-[clamp(140px,24vh,240px)]' : 'size-[clamp(80px,13vh,130px)]'} />;
}

function BudgetPicker({ budget }: { budget: number }) {
  return (
    <div className="flex items-center gap-5 text-lg">
      <span className="text-zinc-500">Budget</span>
      {BUDGETS.map((b) => (
        <button key={b} type="button" onClick={() => void act('budget', { budget: b })} className={b === budget ? 'font-semibold underline underline-offset-4' : 'text-zinc-500 hover:text-zinc-900'}>{money(b)}</button>
      ))}
    </div>
  );
}

function Lobby({ snap }: { snap: Snapshot }) {
  const m = snap.mission;
  return (
    <>
      <Title>Let's book Tomer a vacation</Title>
      <Lead>An AI agent books it live, in a real browser. You decide where he goes, and what goes wrong on the way.</Lead>
      <p className="text-xl">{money(m.budget)} · {m.nights} nights · From Tel Aviv · Leaving 12 December</p>
      <div className="flex items-center gap-8 border-y border-zinc-200 py-6">
        <Qr big />
        <div className="flex flex-col gap-1">
          <b className="text-2xl font-semibold tracking-tight">Scan now to join</b>
          <span className="font-mono text-base font-semibold">{voteHost}</span>
          <span className="text-zinc-500">Votes pop up on your phone when it is your turn.</span>
          <span className="mt-2 text-xl font-semibold tabular-nums">{snap.audience} {snap.audience === 1 ? 'phone' : 'phones'} in</span>
        </div>
      </div>
      {isPresenter && <BudgetPicker budget={m.budget} />}
      {isPresenter && <Primary onClick={() => void start(meta.defaultRuntime)}>Start</Primary>}
    </>
  );
}

function VoteOption({ vote, id, label, blurb }: { vote: ActiveVote; id: string; label: string; blurb?: string }) {
  const n = vote.tally[id] ?? 0;
  const pct = vote.total ? Math.round((n / vote.total) * 100) : 0;
  const lead = n > 0 && n === Math.max(...Object.values(vote.tally));
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-4 text-[clamp(17px,2.8vh,24px)]">
        <span><b className="font-semibold">{label}</b>{blurb && <small className="block text-[clamp(13px,1.8vh,16px)] text-zinc-500">{blurb}</small>}</span>
        <span className="font-semibold text-zinc-500 tabular-nums">{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-100"><i className={`block h-full transition-all ${lead ? 'bg-zinc-900' : 'bg-zinc-300'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function VoteScene({ vote, secondsLeft }: { vote: ActiveVote; secondsLeft: number }) {
  return (
    <>
      <Kicker tone="text-red-600">Crowd vote · {vote.total} {vote.total === 1 ? 'vote' : 'votes'}</Kicker>
      <Title>{vote.question}</Title>
      <div className="flex flex-col gap-[clamp(10px,2vh,18px)]">{vote.options.map((o) => <VoteOption key={o.id} vote={vote} {...o} />)}</div>
      <div className="flex items-center gap-5 border-t border-zinc-200 pt-4">
        <Qr />
        <div><b className="block font-semibold">Vote on your phone</b><span className="font-mono font-semibold">{voteHost}</span></div>
        <span className="ml-auto text-[clamp(28px,5vh,44px)] font-semibold tabular-nums">0:{String(secondsLeft).padStart(2, '0')}</span>
      </div>
      {isPresenter && <button type="button" onClick={() => void act('close-vote')} className="self-start text-sm text-zinc-500 underline underline-offset-4">End vote now</button>}
    </>
  );
}

function MomentScene({ moment }: { moment: Moment }) {
  return (
    <>
      <Kicker tone="text-amber-300">{moment.kicker}</Kicker>
      <Title>{moment.title}</Title>
      {moment.text && <p className="max-w-3xl text-[clamp(17px,2.6vh,24px)] text-zinc-300">{moment.text}</p>}
      <p className="animate-blink text-sm text-zinc-400">{moment.foot}</p>
    </>
  );
}

const paidTotal = (s: Snapshot) => Number(s.events.filter((e) => e.type === 'booking' && e.data.item === 'trip').at(-1)?.data.price ?? spent(s));

function EndScene({ snap }: { snap: Snapshot }) {
  const again = isPresenter && <Secondary onClick={() => void act('reset')}>Back to the lobby</Secondary>;
  if (snap.stopped) return <><Kicker tone="text-amber-700">The agent stopped</Kicker><Title small>{snap.stopped}</Title><Lead>{snap.thought}</Lead>{again}</>;
  return (
    <>
      <Kicker tone="text-green-700">Trip booked</Kicker>
      <Title>Paid {money(paidTotal(snap))}</Title>
      <Lead>{snap.finished}</Lead>
      <div className="max-w-xl divide-y divide-zinc-100 border-y border-zinc-200">
        {bookings(snap).map((b) => <div key={b.label} className="flex justify-between py-2 text-base"><span className="text-zinc-500">{b.label}</span><b className="font-medium">{money(b.price)}</b></div>)}
      </div>
      {again}
    </>
  );
}

interface Scene { name: string; dark?: boolean; body: ReactNode }

type Picker = (snap: Snapshot, moment: Moment | null, secondsLeft: number) => Scene | null | false;

const PICKERS: Picker[] = [
  (snap) => snap.pendingAsk !== null && { name: 'ask', body: <AskScene ask={snap.pendingAsk} /> },
  (_snap, moment) => moment !== null && { name: `moment-${moment.at}-${moment.title}`, dark: true, body: <MomentScene moment={moment} /> },
  (snap, _m, secondsLeft) => snap.vote !== null && { name: `vote-${snap.vote.id}`, body: <VoteScene vote={snap.vote} secondsLeft={secondsLeft} /> },
  (snap) => Boolean(snap.finished ?? snap.stopped) && { name: 'end', body: <EndScene snap={snap} /> },
  (snap) => snap.runMode === 'idle' && { name: 'lobby', body: <Lobby snap={snap} /> },
];

function pickScene(snap: Snapshot, moment: Moment | null, secondsLeft: number): Scene | null {
  for (const pick of PICKERS) {
    const scene = pick(snap, moment, secondsLeft);
    if (scene) return scene;
  }
  return null;
}

export function Stage({ snap, moment, secondsLeft }: { snap: Snapshot; moment: Moment | null; secondsLeft: number }) {
  const scene = pickScene(snap, moment, secondsLeft);
  if (!scene) return null;
  return (
    <div className={`fixed inset-0 z-10 flex items-center justify-center px-[6vw] py-[4vh] backdrop-blur-md ${scene.dark ? 'bg-zinc-950/95 text-white' : 'bg-zinc-50/95'}`}>
      <div key={scene.name} className="flex w-full max-w-5xl animate-rise flex-col gap-[clamp(14px,2.6vh,24px)]">{scene.body}</div>
    </div>
  );
}
