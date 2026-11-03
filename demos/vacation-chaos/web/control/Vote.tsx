import type { ReactNode } from 'react';
import type { ActiveVote } from '../../src/show/engine';
import { act, isPresenter } from './presenter';
import { Kicker, Title } from './Scene';
import { voteHost } from './show';

const seconds = (until: number, serverNow: number) => Math.max(0, Math.ceil((until - serverNow) / 1000));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Qr() {
  return <img src="/qr.svg" alt="QR code to vote" className="size-[clamp(72px,11vh,110px)]" />;
}

function Control({ children, onClick, strong = false }: { children: ReactNode; onClick: () => void; strong?: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2.5 text-base font-semibold ${strong ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'border border-zinc-300 hover:bg-zinc-100'}`}>{children}</button>;
}

export function PauseControl({ paused }: { paused: boolean }) {
  return paused ? <Control strong onClick={() => void act('resume')}>Resume</Control> : <Control onClick={() => void act('pause')}>Pause</Control>;
}

function Option({ vote, id, label, blurb }: { vote: ActiveVote; id: string; label: string; blurb?: string }) {
  const n = vote.tally[id] ?? 0;
  const pct = vote.total ? Math.round((n / vote.total) * 100) : 0;
  const lead = n > 0 && n === Math.max(...Object.values(vote.tally));
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-4 text-[clamp(17px,2.4vh,22px)]">
        <span><b className="font-semibold">{label}</b>{blurb && <small className="block text-[clamp(13px,1.7vh,15px)] text-zinc-500">{blurb}</small>}</span>
        <span className="font-semibold text-zinc-500 tabular-nums">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100"><i className={`block h-full transition-all ${lead ? 'bg-zinc-900' : 'bg-zinc-300'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function HeadsUpBanner({ vote, serverNow }: { vote: ActiveVote; serverNow: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex animate-slide items-center gap-6 bg-red-600 px-8 py-4 text-white shadow-xl">
      <span className="text-[clamp(28px,5vh,48px)] font-black tabular-nums">{seconds(vote.opensAt, serverNow)}</span>
      <div className="flex-1"><b className="block text-[clamp(20px,3vh,30px)] font-bold">Crowd vote coming up. Phones out.</b><span className="text-lg text-red-100">{vote.question} · {voteHost}</span></div>
      <span className="rounded-lg bg-white p-1.5"><Qr /></span>
    </div>
  );
}

export function VotePanel({ vote, serverNow, paused }: { vote: ActiveVote; serverNow: number; paused: boolean }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(620px,44vw)] animate-slide flex-col justify-center gap-5 border-l border-zinc-200 bg-white px-10 shadow-2xl">
      <Kicker tone="text-red-600">Crowd vote · {vote.total} {vote.total === 1 ? 'vote' : 'votes'}{paused ? ' · paused' : ''}</Kicker>
      <Title small>{vote.question}</Title>
      <div className="flex flex-col gap-4">{vote.options.map((o) => <Option key={o.id} vote={vote} {...o} />)}</div>
      <div className="flex items-center gap-5 border-t border-zinc-200 pt-4">
        <Qr />
        <div><b className="block font-semibold">Vote on your phone</b><span className="font-mono font-semibold">{voteHost}</span></div>
        <span className="ml-auto text-[clamp(28px,5vh,44px)] font-semibold tabular-nums">{clock(seconds(vote.closesAt, serverNow))}</span>
      </div>
      {isPresenter && (
        <div className="flex flex-wrap gap-2">
          <Control strong onClick={() => void act('close-vote')}>Finish vote</Control>
          <Control onClick={() => void act('extend-vote')}>+15 seconds</Control>
          <PauseControl paused={paused} />
        </div>
      )}
    </aside>
  );
}

export function PausedBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-6 bg-zinc-900 px-8 py-4 text-white shadow-xl">
      <b className="flex-1 text-[clamp(20px,3vh,30px)] font-bold">Paused. Tomer is talking.</b>
      {isPresenter && <PauseControl paused />}
    </div>
  );
}
