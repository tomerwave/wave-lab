import { useEffect, useState } from 'react';
import type { TourStop } from '../../src/tour';

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
    <pre className="min-h-0 flex-1 overflow-auto rounded-xl bg-zinc-950 p-6 font-mono text-[15px] leading-relaxed text-zinc-100">
      {stop.code.split('\n').map((line, i) => (
        <div key={i} className="flex gap-5"><span className="w-8 shrink-0 select-none text-right text-zinc-600">{stop.start + i}</span><span className="whitespace-pre-wrap">{line}</span></div>
      ))}
    </pre>
  );
}

export function Tour() {
  const stops = useTour();
  const [index, setIndex] = useState(0);
  useArrowKeys(stops.length, setIndex);
  const stop = stops[index];
  return (
    <div className="flex h-full gap-6 overflow-hidden p-8">
      <nav className="flex w-80 shrink-0 flex-col gap-1">
        <h1 className="mb-1 text-lg font-semibold">Code tour</h1>
        <p className="mb-4 text-sm text-zinc-500">How Vacation Chaos works, in nine stops. Use the arrow keys.</p>
        {stops.map((s, i) => (
          <button key={s.title} type="button" onClick={() => setIndex(i)} className={`rounded-lg px-3 py-2 text-left text-sm ${i === index ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
            <span className="mr-2 tabular-nums opacity-60">{i + 1}</span>{s.title}
          </button>
        ))}
        <a href="/control" className="mt-auto text-sm text-zinc-500 underline underline-offset-4">Back to Mission Control</a>
      </nav>
      {stop && (
        <main key={stop.title} className="flex min-w-0 flex-1 animate-rise flex-col gap-4">
          <p className="font-mono text-sm text-zinc-500">{stop.file}:{stop.start}</p>
          <h2 className="text-4xl font-semibold tracking-tight">{stop.title}</h2>
          <p className="max-w-3xl text-xl leading-snug text-zinc-600">{stop.why}</p>
          <Code stop={stop} />
        </main>
      )}
    </div>
  );
}
