import { useState } from 'react';
import type { Ask, AskKind } from '../../src/show/types';
import { act, humanCheckDone, isPresenter } from './presenter';
import { meta } from './show';
import { Kicker, Primary, Secondary, Title } from './Scene';

const KICKERS: Record<AskKind, string> = {
  'human-check': 'The agent needs a human',
  approval: 'The agent needs your approval',
  question: 'The agent asks you',
};

const answer = (text: string, approve = false) => void act('answer', { text, approve });

function GoatCell({ index, onGoat }: { index: number; onGoat: () => void }) {
  const goat = meta.goatCells.includes(index);
  const [state, setState] = useState<'idle' | 'picked' | 'nope'>('idle');
  const pick = () => {
    if (state === 'picked') return;
    if (!goat) return setState('nope');
    setState('picked');
    onGoat();
  };
  const ring = { idle: 'border-transparent', picked: 'border-zinc-900', nope: 'animate-shake border-transparent' }[state];
  return (
    <button type="button" onClick={pick} onAnimationEnd={() => setState('idle')} aria-label={`Square ${index + 1}`}
      className={`flex aspect-square items-center justify-center rounded-xl border-4 bg-[linear-gradient(180deg,#bfdbfe_0_45%,#bbf7d0_45%_100%)] ${ring}`}>
      {goat && <span className="w-3/5" dangerouslySetInnerHTML={{ __html: meta.goat }} />}
    </button>
  );
}

function GoatCheck() {
  const [found, setFound] = useState(0);
  const onGoat = () => {
    const next = found + 1;
    setFound(next);
    if (next === meta.goatCells.length) void humanCheckDone();
  };
  return (
    <>
      <p className="text-lg text-zinc-500">Robots are not allowed. Tap every goat.</p>
      <div className="grid w-fit grid-cols-3 gap-2.5 [&>*]:w-[clamp(90px,14vh,130px)]">
        {Array.from({ length: 9 }, (_, i) => <GoatCell key={i} index={i} onGoat={onGoat} />)}
      </div>
    </>
  );
}

function Approval() {
  return (
    <div className="flex gap-3">
      <Primary onClick={() => answer('Approved. Go ahead and pay.', true)}>Approve</Primary>
      <Secondary onClick={() => answer('Declined. Stay within the budget.')}>Decline</Secondary>
    </div>
  );
}

function Answers({ options }: { options: string[] }) {
  const [typed, setTyped] = useState('');
  const choices = options.length ? options : ['Yes, go ahead', 'No'];
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {choices.map((o, i) => (i === 0 ? <Primary key={o} onClick={() => answer(o)}>{o}</Primary> : <Secondary key={o} onClick={() => answer(o)}>{o}</Secondary>))}
      </div>
      <form className="flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) answer(typed.trim()); }}>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type an answer" className="flex-1 rounded-lg border border-zinc-300 px-3.5 py-2.5 text-base" />
        <button type="submit" className="rounded-lg border border-zinc-300 px-5 font-medium hover:bg-zinc-100">Send</button>
      </form>
    </>
  );
}

function Controls({ ask }: { ask: Ask }) {
  if (!isPresenter) return <p className="text-lg text-zinc-500">Waiting for Tomer to answer.</p>;
  if (ask.kind === 'human-check') return <GoatCheck />;
  if (ask.kind === 'approval') return <Approval />;
  return <Answers options={ask.options} />;
}

export function AskPanel({ ask }: { ask: Ask }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-[min(620px,44vw)] animate-slide flex-col justify-center gap-6 border-l border-zinc-200 bg-white px-10 shadow-2xl">
      <Kicker tone="text-amber-700">{KICKERS[ask.kind]}</Kicker>
      <Title small>{ask.question}</Title>
      <Controls ask={ask} />
    </aside>
  );
}
