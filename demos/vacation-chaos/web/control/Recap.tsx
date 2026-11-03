import type { ReactNode } from 'react';
import type { Snapshot } from '../../src/show/engine';
import { bookings, money, spent } from './format';
import { agentCoreLinks, costOf } from './links';
import { act, isPresenter } from './presenter';
import { Kicker, Secondary, Title } from './Scene';

function Column({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5"><h3 className="text-sm font-medium text-zinc-500">{title}</h3>{children}</section>;
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2 text-[15px] first:border-t-0 first:pt-0"><span className="text-zinc-500">{name}</span><b className="text-right font-semibold">{children}</b></div>;
}

function WhatHappened({ snap }: { snap: Snapshot }) {
  return (
    <Column title="What happened">
      {snap.recap.choices.map((c, i) => (
        <div key={`${c.winner}-${i}`} className="border-t border-zinc-100 pt-2 first:border-t-0 first:pt-0">
          <span className="text-xs text-zinc-500">{c.by === 'crowd' ? `${c.question} · the crowd, ${c.votes} votes` : 'The world threw in'}</span>
          <p className="text-[15px] font-semibold leading-snug">{c.winner}</p>
        </div>
      ))}
    </Column>
  );
}

function WhatTheAgentDid({ snap }: { snap: Snapshot }) {
  const r = snap.recap;
  return (
    <Column title="What the agent did">
      {bookings(snap).map((b) => <Row key={b.label} name={b.label}>{money(b.price)}</Row>)}
      {r.jev.slice(-3).map((pick) => <p key={pick} className="text-sm leading-snug"><span className="text-zinc-500">Jev picked </span>{pick}</p>)}
      <Row name="Asked a human">{r.asks.length} {r.asks.length === 1 ? 'time' : 'times'}</Row>
      <Row name="Pages · clicks · thoughts">{r.pages} · {r.clicks} · {r.thoughts}</Row>
    </Column>
  );
}

const seconds = (ms: number) => `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;

function UnderTheHood({ snap }: { snap: Snapshot }) {
  const t = snap.telemetry;
  const r = snap.recap;
  const cost = costOf(t.model, t.inputTokens, t.outputTokens);
  const links = snap.run ? agentCoreLinks(snap.run) : [];
  return (
    <Column title="Under the hood">
      {r.startedAt && r.endedAt && <Row name="Run time">{seconds(r.endedAt - r.startedAt)}</Row>}
      <Row name="Tool calls">{t.toolCalls}</Row>
      <Row name="Tokens in · out">{(t.inputTokens / 1000).toFixed(0)}k · {(t.outputTokens / 1000).toFixed(1)}k</Row>
      {cost !== null && <Row name="Model cost">about ${cost.toFixed(2)}</Row>}
      <Row name="Model">{(t.model ?? 'n/a').replace(/^eu\.anthropic\./, '').replace(/-\d{8}-v1:0/, '')}</Row>
      <div className="mt-1 flex flex-col gap-1.5 border-t border-zinc-100 pt-3 text-[15px]">
        {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">{l.label}</a>)}
        <a href="/tour" target="_blank" rel="noreferrer" className="font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">Code tour</a>
      </div>
      {snap.run && <p className="font-mono text-xs text-zinc-400">{snap.run.sessionId}</p>}
    </Column>
  );
}

const paidTotal = (s: Snapshot) => Number(s.events.filter((e) => e.type === 'booking' && e.data.item === 'trip').at(-1)?.data.price ?? spent(s));

export function Recap({ snap }: { snap: Snapshot }) {
  const stopped = Boolean(snap.stopped) && !snap.finished;
  return (
    <>
      <Kicker tone={stopped ? 'text-amber-700' : 'text-green-700'}>{stopped ? 'The agent stopped' : 'Trip booked'}</Kicker>
      <Title small>{stopped ? snap.stopped : `Paid ${money(paidTotal(snap))} of ${money(snap.mission.budget)}`}</Title>
      <p className="line-clamp-2 max-w-4xl text-lg text-zinc-500">{snap.finished ?? snap.thought}</p>
      <div className="grid grid-cols-3 gap-4">
        <WhatHappened snap={snap} />
        <WhatTheAgentDid snap={snap} />
        <UnderTheHood snap={snap} />
      </div>
      {isPresenter && <Secondary onClick={() => void act('reset')}>Back to the lobby</Secondary>}
    </>
  );
}
