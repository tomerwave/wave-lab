import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Booking, ShowEvent, Snapshot } from '../../src/show/engine';
import type { Mission } from '../../src/show/types';
import { money, spent } from './format';

const MIRROR_WIDTH = 1280;

export function Card({ label, children, grow = false }: { label: string; children: ReactNode; grow?: boolean }) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white px-4 py-3.5 ${grow ? 'min-h-0 flex-1 overflow-hidden' : ''}`}>
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
      {live && <p className="text-sm text-zinc-500">Live · {snap.mission.destination ? `Tomer to ${snap.mission.destination}` : 'Where is Tomer going?'}</p>}
    </header>
  );
}

function useMirrorScale() {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, height: 800 });
  useEffect(() => {
    const el = box.current!;
    const fit = () => { const scale = el.clientWidth / MIRROR_WIDTH; setSize({ scale, height: el.clientHeight / scale }); };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { box, ...size };
}

function LastClick({ label }: { label: string | null }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!label) return;
    setShown(true);
    const id = setTimeout(() => setShown(false), 2200);
    return () => clearTimeout(id);
  }, [label]);
  return (
    <div className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity ${shown ? 'opacity-100' : 'opacity-0'}`}>
      Agent clicked: {label}
    </div>
  );
}

export function AgentBrowser({ snap }: { snap: Snapshot }) {
  const { box, scale, height } = useMirrorScale();
  const pages = snap.events.filter((e) => e.type === 'page').length;
  const key = JSON.stringify([snap.route, snap.site, snap.applied, snap.booked, snap.cart, snap.mission, pages]);
  const src = `${snap.route}${snap.route.includes('?') ? '&' : '?'}mirror=1`;
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-3 py-2">
        <span className="flex gap-1.5">{[0, 1, 2].map((i) => <i key={i} className="size-2.5 rounded-full bg-zinc-200" />)}</span>
        <span className="flex-1 truncate rounded-md bg-zinc-100 px-3 py-1 font-mono text-xs text-zinc-500">sunnyhop.demo{snap.route.replace(/^\/site/, '') || '/'}</span>
        <span className="text-xs text-zinc-500">The agent's browser</span>
      </div>
      <div ref={box} className="relative min-h-0 flex-1 overflow-hidden">
        <iframe key={key} title="Agent browser mirror" src={src} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: MIRROR_WIDTH, height, transform: `scale(${scale})` }} />
        <LastClick label={snap.lastClick} />
      </div>
    </section>
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

const STEP_KINDS: Partial<Record<ShowEvent['type'], string>> = { click: 'Did', booking: 'Booked', twist: 'Twist', answer: 'Human' };

function stepText(e: ShowEvent): string {
  const d = e.data as Record<string, string | undefined>;
  return d.text ?? d.label ?? d.question ?? d.winner ?? '';
}

function Activity({ events }: { events: ShowEvent[] }) {
  const shown = events.filter((e) => e.type === 'step' || e.type in STEP_KINDS).slice(-6).reverse();
  return (
    <Card label="Activity" grow>
      {shown.map((e, i) => (
        <div key={`${e.at}-${i}`} className="grid grid-cols-[70px_1fr] gap-2 border-t border-zinc-100 py-1.5 text-[13px] first:border-t-0">
          <span className="pt-px text-[11px] font-medium text-zinc-500">{e.type === 'step' ? String(e.data.kind) : STEP_KINDS[e.type]}</span>
          {stepText(e)}
        </div>
      ))}
    </Card>
  );
}

export function Sidebar({ snap }: { snap: Snapshot }) {
  return (
    <aside className="flex min-h-0 flex-col gap-3">
      <Card label="The agent is thinking"><p className="line-clamp-5 text-base font-medium leading-snug tracking-tight">{snap.finished ?? snap.thought ?? 'Waiting for the mission.'}</p></Card>
      <Budget snap={snap} />
      <Card label="Booked"><Line name="Flight">{booked(snap.booked.flight)}</Line><Line name="Hotel">{booked(snap.booked.hotel)}</Line></Card>
      <Activity events={snap.events} />
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
