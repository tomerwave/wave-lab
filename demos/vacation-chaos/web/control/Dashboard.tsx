import type { ReactNode } from 'react';
import type { Booking, Snapshot } from '../../src/show/engine';
import type { Mission } from '../../src/show/types';
import { money, spent } from './format';

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5">
      <h3 className="mb-1.5 text-xs font-medium text-zinc-500">{label}</h3>
      {children}
    </section>
  );
}

function Line({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-t border-zinc-100 py-1.5 text-[13px] first:border-t-0">
      <span className="shrink-0 text-zinc-500">{name}</span>
      <b className="text-right font-medium">{children}</b>
    </div>
  );
}

export function Header({ snap }: { snap: Snapshot }) {
  const live = snap.runMode !== 'idle' && !snap.finished && !snap.stopped;
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/static/img/tomerwave-icon.svg" alt="TomerWave" className="size-8" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Vacation Chaos</h1>
          <p className="text-[13px] text-zinc-500">The crowd books Tomer a vacation. An AI agent does the clicking.</p>
        </div>
      </div>
      {live && <p className="text-base font-medium text-zinc-700">{snap.runMode === 'replay' ? 'Scripted replay' : 'Live'} · {snap.mission.destination ? `Tomer to ${snap.mission.destination}` : 'Where is Tomer going?'}</p>}
    </header>
  );
}

function missionRows(m: Mission): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['Who', m.partySize > 2 ? `${m.partySize} people` : m.travellers.join(' + ')],
    ['Where', m.destination ?? 'The crowd decides'],
    ['Nights', `${m.nights}, from 12 Dec`],
    ['Must', m.musts.join(', ') || 'Nothing yet'],
    ['Never', m.nevers.join(', ') || 'Nothing yet'],
  ];
  return m.persona ? [...rows, ['Voice', m.persona]] : rows;
}

function Budget({ snap }: { snap: Snapshot }) {
  const { budget } = snap.mission;
  const left = budget - spent(snap);
  return (
    <Card label="Budget left">
      <div className={`text-3xl font-semibold tracking-tight tabular-nums ${left < budget * 0.3 ? 'text-red-500' : ''}`}>{money(left)}</div>
      <p className="mt-0.5 text-xs text-zinc-500">of {money(budget)}. Spent {money(spent(snap))}.</p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"><i className="block h-full bg-zinc-900 transition-all" style={{ width: `${Math.max(0, Math.min(100, (left / budget) * 100))}%` }} /></div>
      <div className="mt-2.5">{missionRows(snap.mission).map(([k, v]) => <Line key={k} name={k}>{v}</Line>)}</div>
    </Card>
  );
}

const booked = (b: Booking | null) => (b ? `${b.label} · ${money(b.price)}` : <span className="font-normal text-zinc-400">Not yet</span>);

const NEXT_VOTE = ['When the agent picks a flight', 'When the agent opens a hotel'];

function UpNext({ snap }: { snap: Snapshot }) {
  const next = snap.mission.ready ? NEXT_VOTE[snap.chaosVotes] ?? 'No more votes. Just vibes.' : 'Right after Start';
  return <Card label="Next crowd vote"><p className="text-[15px] font-semibold">{next}</p></Card>;
}

export function Sidebar({ snap }: { snap: Snapshot }) {
  return (
    <aside className="flex min-h-0 flex-col gap-3">
      <Budget snap={snap} />
      <Card label="Booked"><Line name="Flight">{booked(snap.booked.flight)}</Line><Line name="Hotel">{booked(snap.booked.hotel)}</Line></Card>
      <UpNext snap={snap} />
      <Card label="Last crowd vote"><p className="text-[15px] font-semibold">{snap.lastResult?.winner ?? <span className="font-normal text-zinc-400">None yet</span>}</p></Card>
    </aside>
  );
}

export function Telemetry({ snap }: { snap: Snapshot }) {
  const t = snap.telemetry;
  const tokens = t.inputTokens + t.outputTokens;
  const items: Array<[string, string]> = [
    ['Tool calls', String(t.toolCalls)],
    ['Tokens', tokens ? `${(tokens / 1000).toFixed(1)}k` : 'n/a'],
    ['Model time', t.latencyMs ? `${(t.latencyMs / 1000).toFixed(1)}s` : 'n/a'],
    ['Events', String(snap.events.length)],
  ];
  return (
    <footer className="flex gap-6 text-xs text-zinc-500">
      {items.map(([k, v]) => <span key={k}>{k} <b className="ml-1 font-semibold text-zinc-900 tabular-nums">{v}</b></span>)}
    </footer>
  );
}
