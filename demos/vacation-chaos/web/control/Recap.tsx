import type { Snapshot } from '../../src/show/engine';
import { bookings, money, spent } from './format';
import { agentCoreLinks, costOf } from './links';
import { act, isPresenter } from './presenter';
import { Kicker, Title } from './Scene';

const paidTotal = (s: Snapshot) => Number(s.events.filter((e) => e.type === 'booking' && e.data.item === 'trip').at(-1)?.data.price ?? spent(s));
const duration = (ms: number) => `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;

function BudgetBar({ paid, budget }: { paid: number; budget: number }) {
  const over = paid > budget;
  return <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200"><i className={`block h-full rounded-full ${over ? 'bg-amber-500' : 'bg-zinc-900'}`} style={{ width: `${Math.min(100, (paid / budget) * 100)}%` }} /></div>;
}

function Trip({ snap }: { snap: Snapshot }) {
  return (
    <div className="grid grid-cols-2 gap-[clamp(24px,5vw,72px)]">
      {bookings(snap).map((b) => (
        <div key={b.label} className="flex items-baseline justify-between gap-6">
          <span className="truncate text-[clamp(18px,2.6vh,26px)] font-medium">{b.label}</span>
          <span className="text-[clamp(18px,2.6vh,26px)] text-zinc-500 tabular-nums">{money(b.price)}</span>
        </div>
      ))}
    </div>
  );
}

const jevPick = (text: string) => ({ name: text.split(/[,(]/)[0]!.trim(), sure: /\((\d+%)\)$/.exec(text)?.[1] });

function JevChoices({ picks }: { picks: string[] }) {
  if (picks.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[clamp(14px,1.9vh,18px)] text-zinc-500">Jev chose</h3>
      <div className="grid grid-cols-3 gap-[clamp(24px,5vw,72px)]">
        {picks.slice(-3).map(jevPick).map((p) => (
          <div key={p.name} className="flex items-baseline justify-between gap-4">
            <span className="truncate text-[clamp(18px,2.6vh,26px)] font-medium">{p.name}</span>
            {p.sure && <span className="text-[clamp(14px,2vh,19px)] text-zinc-500 tabular-nums">{p.sure}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Timeline({ snap }: { snap: Snapshot }) {
  const { choices } = snap.recap;
  return (
    <ol className="grid border-t-2 border-zinc-200" style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}>
      {choices.map((c, i) => (
        <li key={`${c.winner}-${i}`} className="relative pr-4 pt-4">
          <i className={`absolute -top-[7px] left-0 size-3 rounded-full ${c.by === 'crowd' ? 'bg-zinc-900' : 'border-2 border-zinc-400 bg-zinc-50'}`} />
          <p className="line-clamp-2 text-[clamp(14px,2vh,19px)] font-medium leading-snug">{c.winner.split(':')[0]}</p>
        </li>
      ))}
    </ol>
  );
}

function Stat({ value, name }: { value: string; name: string }) {
  return <div className="flex flex-col"><b className="text-[clamp(30px,5.4vh,56px)] font-semibold leading-none tracking-tighter tabular-nums">{value}</b><span className="mt-2 text-[clamp(14px,1.9vh,18px)] text-zinc-500">{name}</span></div>;
}

function Stats({ snap }: { snap: Snapshot }) {
  const { recap: r, telemetry: t } = snap;
  const cost = costOf(t.model, t.inputTokens, t.outputTokens);
  return (
    <div className="flex justify-between gap-8">
      {r.startedAt && r.endedAt && <Stat value={duration(r.endedAt - r.startedAt)} name="Start to finish" />}
      <Stat value={String(r.pages)} name="Pages" />
      <Stat value={String(t.toolCalls)} name="Tool calls" />
      <Stat value={String(r.asks.length)} name="Asked a human" />
      {cost !== null && <Stat value={`$${cost.toFixed(2)}`} name="Model cost" />}
    </div>
  );
}

function Links({ snap }: { snap: Snapshot }) {
  const links = [...(snap.run ? agentCoreLinks(snap.run) : []), { label: 'Code tour', href: '/tour' }];
  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-zinc-500">
      {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">{l.label}</a>)}
      {isPresenter && <button type="button" onClick={() => void act('reset')} className="ml-auto underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">Back to the lobby</button>}
    </nav>
  );
}

function Destination({ snap }: { snap: Snapshot }) {
  const voted = snap.recap.choices[0]?.winner;
  const takenOver = snap.applied.includes('takeover') && voted !== snap.mission.destination;
  return <>{takenOver && <s className="mr-3 font-medium text-zinc-400">{voted}</s>}{snap.mission.destination}</>;
}

export function Recap({ snap }: { snap: Snapshot }) {
  const stopped = Boolean(snap.stopped) && !snap.finished;
  const paid = paidTotal(snap);
  return (
    <div className="flex flex-col gap-[clamp(20px,4.4vh,44px)]">
      <header className="flex flex-col gap-3">
        <Kicker tone={stopped ? 'text-amber-700' : 'text-green-700'}>{stopped ? 'The agent stopped' : 'Trip booked'}</Kicker>
        <Title>{stopped ? snap.stopped : <><Destination snap={snap} /> · {money(paid)} of {money(snap.mission.budget)}</>}</Title>
        <BudgetBar paid={paid} budget={snap.mission.budget} />
      </header>
      <Trip snap={snap} />
      <JevChoices picks={snap.recap.jev} />
      <Timeline snap={snap} />
      <Stats snap={snap} />
      <Links snap={snap} />
    </div>
  );
}
