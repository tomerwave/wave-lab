import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Snapshot } from '../../src/show/engine';

const MIRROR_WIDTH = 1280;
const HOLD_MS = 700;
const CLICK_MS = 1400;
const PRESS_MS = 350;
const HIGHLIGHT_MS = 1600;

interface Mirror { key: string; src: string }
interface Click { seq: number; label: string }
interface Box { left: number; top: number; width: number; height: number }

function mirrorOf(snap: Snapshot): Mirror {
  const pages = snap.events.filter((e) => e.type === 'page').length;
  return {
    key: JSON.stringify([snap.route, snap.site, snap.applied, snap.booked, snap.cart, snap.mission, pages]),
    src: `${snap.route}${snap.route.includes('?') ? '&' : '?'}mirror=1`,
  };
}

function latestClick(snap: Snapshot): Click | null {
  const e = snap.events.filter((ev) => ev.type === 'click').at(-1);
  return e ? { seq: e.seq, label: String(e.data.label) } : null;
}

function useHeldMirror(next: Mirror, clickSeq: number): Mirror {
  const [shown, setShown] = useState(next);
  const latest = useRef(next);
  const clickedAt = useRef(0);
  latest.current = next;
  useEffect(() => { clickedAt.current = Date.now(); }, [clickSeq]);
  useEffect(() => {
    if (next.key === shown.key) return;
    const wait = Math.max(HOLD_MS, clickedAt.current + CLICK_MS - Date.now());
    const id = setTimeout(() => setShown(latest.current), wait);
    return () => clearTimeout(id);
  }, [next.key, shown.key, clickSeq]);
  return shown;
}

function useScale() {
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

function locate(frame: HTMLIFrameElement | null, label: string, scale: number): Box | null {
  const el = frame?.contentDocument?.querySelector(`[data-label="${CSS.escape(label)}"]`);
  if (!el) return null;
  const view = el.ownerDocument.defaultView!;
  view.scrollBy(0, el.getBoundingClientRect().top - view.innerHeight / 3);
  const r = el.getBoundingClientRect();
  return { left: r.left * scale, top: r.top * scale, width: r.width * scale, height: r.height * scale };
}

function useCursor(frame: RefObject<HTMLIFrameElement | null>, click: Click | null, scale: number) {
  const [target, setTarget] = useState<Box | null>(null);
  const [pressed, setPressed] = useState(false);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!click) return;
    const box = locate(frame.current, click.label, scale);
    if (box) setTarget(box);
    setLit(Boolean(box));
    const press = setTimeout(() => setPressed(true), 600);
    const release = setTimeout(() => setPressed(false), 600 + PRESS_MS);
    const unlit = setTimeout(() => setLit(false), HIGHLIGHT_MS);
    return () => [press, release, unlit].forEach(clearTimeout);
  }, [click?.seq]);
  return { target, pressed, lit };
}

function Pointer({ box, pressed, label }: { box: Box | null; pressed: boolean; label: string | null }) {
  const x = box ? box.left + box.width / 2 : 40;
  const y = box ? box.top + box.height / 2 : 40;
  return (
    <div className="pointer-events-none absolute left-0 top-0 z-10 transition-transform duration-[600ms] ease-out" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <svg width="30" height="30" viewBox="0 0 24 24" className={`drop-shadow-md transition-transform ${pressed ? 'scale-75' : ''}`}>
        <path d="M4 2l15 10.5-6.6 1.2 3.9 7.3-2.7 1.4-3.9-7.3L4 20z" fill="#18181b" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {label && <span className="absolute left-7 top-6 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-sm font-medium text-white shadow-lg">{label}</span>}
    </div>
  );
}

function Highlight({ box, lit }: { box: Box | null; lit: boolean }) {
  if (!box) return null;
  return <div className={`pointer-events-none absolute rounded-lg border-2 border-sky-500 bg-sky-500/10 transition-opacity duration-500 ${lit ? 'opacity-100' : 'opacity-0'}`} style={{ left: box.left - 4, top: box.top - 4, width: box.width + 8, height: box.height + 8 }} />;
}

export function AgentBrowser({ snap }: { snap: Snapshot }) {
  const { box, scale, height } = useScale();
  const frame = useRef<HTMLIFrameElement>(null);
  const click = latestClick(snap);
  const mirror = useHeldMirror(mirrorOf(snap), click?.seq ?? 0);
  const { target, pressed, lit } = useCursor(frame, click, scale);
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-3 py-2">
        <span className="flex gap-1.5">{[0, 1, 2].map((i) => <i key={i} className="size-2.5 rounded-full bg-zinc-200" />)}</span>
        <span className="flex-1 truncate rounded-md bg-zinc-100 px-3 py-1 font-mono text-xs text-zinc-500">sunnyhop.demo{snap.route.replace(/^\/site/, '') || '/'}</span>
        <span className="text-xs text-zinc-500">The agent's browser</span>
      </div>
      <div ref={box} className="relative min-h-0 flex-1 overflow-hidden">
        <iframe ref={frame} key={mirror.key} title="Agent browser mirror" src={mirror.src} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: MIRROR_WIDTH, height, transform: `scale(${scale})` }} />
        <Highlight box={target} lit={lit} />
        <Pointer box={target} pressed={pressed} label={lit ? click?.label ?? null : null} />
      </div>
      <div className="border-t border-zinc-200 px-5 py-4">
        <p className="text-xs font-medium text-zinc-500">The agent</p>
        <p className="mt-1 line-clamp-3 text-[clamp(18px,2.5vh,26px)] font-medium leading-snug tracking-tight">{snap.finished ?? snap.thought ?? 'Waiting for the mission.'}</p>
      </div>
    </section>
  );
}
