import { useEffect, useState } from 'react';
import { LOGO, SOCIALS } from '../../src/contact';
import type { SiteView, TourStop } from '../../src/tour';

function useTour(): TourStop[] {
  const [stops, setStops] = useState<TourStop[]>([]);
  useEffect(() => { void fetch('/api/tour').then((r) => r.json() as Promise<TourStop[]>).then(setStops); }, []);
  return stops;
}

function useArrowKeys(count: number, setIndex: (update: (i: number) => number) => void): void {
  useEffect(() => {
    const step = (e: KeyboardEvent) => {
      const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (delta) setIndex((i) => Math.min(count - 1, Math.max(0, i + delta)));
    };
    document.addEventListener('keydown', step);
    return () => document.removeEventListener('keydown', step);
  }, [count, setIndex]);
}

function Code({ stop }: { stop: TourStop }) {
  return (
    <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-10 py-4 font-mono text-[clamp(16px,1.3vw,22px)] leading-[1.55]">
      {stop.tokens.map((line, i) => (
        <div key={i} className="min-h-[1.55em]">{line.map((token, j) => <span key={j} style={{ color: token.color }}>{token.text}</span>)}</div>
      ))}
    </pre>
  );
}

const kilobytes = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

function ViewPane({ view }: { view: SiteView }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col border-t border-zinc-800 pt-3">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-xl font-semibold">{view.title}</h3><span className="font-mono text-lg text-amber-300">{kilobytes(view.bytes)}</span></div>
      <p className="mb-3 text-[15px] text-zinc-400">{view.note}</p>
      <pre className="min-h-0 flex-1 overflow-hidden whitespace-pre-wrap break-words font-mono text-[14px] leading-relaxed text-zinc-300">{view.text}</pre>
    </section>
  );
}

function Views({ views }: { views: SiteView[] }) {
  return <div className="grid min-h-0 flex-1 grid-cols-3 gap-8 px-10 pb-6">{views.map((view) => <ViewPane key={view.title} view={view} />)}</div>;
}

function Questions() {
  return (
    <main className="flex flex-1 animate-rise flex-col items-center justify-center gap-5 text-center">
      <img src={LOGO} alt="TomerWave" className="size-28 rounded-3xl" />
      <h2 className="text-[120px] font-semibold leading-none tracking-[-0.04em]">Questions?</h2>
      <p className="text-3xl text-zinc-400">Thank you.</p>
      <div className="mt-8 grid grid-cols-3 gap-x-[4vw] gap-y-6 text-left">
        {SOCIALS.map((c) => (
          <a key={c.href} href={c.href} target="_blank" rel="noopener" className="flex flex-col gap-0.5 hover:text-white">
            <span className="text-base text-zinc-500">{c.label}</span>
            <span className="text-[clamp(15px,1.5vw,26px)] font-medium">{c.text}</span>
          </a>
        ))}
      </div>
    </main>
  );
}

function StopView({ stop, position, total }: { stop: TourStop; position: number; total: number }) {
  return (
    <main key={stop.title} className="flex min-h-0 flex-1 animate-rise flex-col">
      <header className="flex flex-col gap-1.5 px-10 pt-5 pb-2">
        <p className="font-mono text-[15px] text-zinc-500">{position} / {total} · {stop.file}</p>
        <h2 className="text-[34px] font-semibold leading-tight tracking-tight">{stop.title}</h2>
        <p className="text-lg leading-snug text-zinc-400">{stop.why}</p>
      </header>
      {stop.views ? <Views views={stop.views} /> : <Code stop={stop} />}
    </main>
  );
}

function Pager({ total, index, setIndex }: { total: number; index: number; setIndex: (i: number) => void }) {
  return (
    <footer className="flex items-center gap-1 border-t border-zinc-800 px-10 py-2.5 text-sm text-zinc-500">
      {Array.from({ length: total }, (_, i) => (
        <button key={i} type="button" aria-label={`Go to stop ${i + 1}`} onClick={() => setIndex(i)} className={`h-7 w-7 rounded tabular-nums ${i === index ? 'bg-zinc-100 text-zinc-950' : 'hover:bg-zinc-800'}`}>{i + 1}</button>
      ))}
      <a href="/control" className="ml-auto underline underline-offset-4">Back to Mission Control</a>
    </footer>
  );
}

export function Tour() {
  const stops = useTour();
  const [index, setIndex] = useState(0);
  const total = stops.length + 1;
  useArrowKeys(total, setIndex);
  const stop = stops[index];
  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950 text-zinc-50">
      {stop ? <StopView stop={stop} position={index + 1} total={stops.length} /> : stops.length > 0 && <Questions />}
      <Pager total={total} index={index} setIndex={setIndex} />
    </div>
  );
}
