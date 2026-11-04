import { useEffect, type ReactNode } from 'react';
import type { Snapshot } from '../../src/show/engine';
import { Primary, Title } from './Scene';
import { MomentScene } from './Looks';
import { Recap } from './Recap';
import type { Moment } from './moments';
import { act, isPresenter, start } from './presenter';
import { money } from './format';
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

const BACK_TO_SLIDES = '/talk?slide=8';

function useBackToSlides(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft' || e.key === 'PageUp') location.assign(BACK_TO_SLIDES); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

function Lobby({ snap }: { snap: Snapshot }) {
  const m = snap.mission;
  useBackToSlides();
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
      {isPresenter && <a href={BACK_TO_SLIDES} className="self-start text-sm text-zinc-500 underline underline-offset-4">Back to the slides</a>}
    </>
  );
}

interface Scene { name: string; dark?: boolean; body: ReactNode }

type Picker = (snap: Snapshot, moment: Moment | null) => Scene | null | false;

const PICKERS: Picker[] = [
  (_snap, moment) => moment !== null && { name: `moment-${moment.at}-${moment.title}`, dark: true, body: <MomentScene moment={moment} /> },
  (snap) => Boolean(snap.finished ?? snap.stopped) && { name: 'end', body: <Recap snap={snap} /> },
  (snap) => snap.runMode === 'idle' && { name: 'lobby', body: <Lobby snap={snap} /> },
];

function pickScene(snap: Snapshot, moment: Moment | null): Scene | null {
  for (const pick of PICKERS) {
    const scene = pick(snap, moment);
    if (scene) return scene;
  }
  return null;
}

export function Stage({ snap, moment }: { snap: Snapshot; moment: Moment | null }) {
  const scene = pickScene(snap, moment);
  if (!scene) return null;
  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center px-[6vw] py-[4vh] backdrop-blur-md ${scene.dark ? 'bg-zinc-950/95 text-white' : 'bg-zinc-50/95'}`}>
      <div key={scene.name} className="flex w-full max-w-6xl animate-rise flex-col gap-[clamp(14px,2.6vh,24px)]">{scene.body}</div>
    </div>
  );
}
