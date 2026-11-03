import { useEffect, useState, type ReactNode } from 'react';

export const SLIDE_W = 1280;
export const SLIDE_H = 720;
export const TOTAL = 9;

function useFit(): number {
  const fit = () => Math.min(window.innerWidth / SLIDE_W, window.innerHeight / SLIDE_H);
  const [scale, setScale] = useState(fit);
  useEffect(() => {
    const resize = () => setScale(fit());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return scale;
}

export function Stage({ children }: { children: ReactNode }) {
  const scale = useFit();
  return (
    <div className="flex h-full items-center justify-center overflow-hidden bg-zinc-50">
      <div className="relative shrink-0 overflow-hidden bg-zinc-50" style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})` }}>{children}</div>
    </div>
  );
}

export function Chrome({ page }: { page?: number }) {
  return (
    <>
      <span className="absolute left-20 top-14 text-[15px] font-semibold">Vacation Chaos</span>
      {page && <span className="absolute right-20 top-14 text-[15px] text-zinc-500 tabular-nums">{page} / {TOTAL}</span>}
    </>
  );
}

export function Slide({ page, children }: { page?: number; children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex animate-rise flex-col gap-7 px-20 pb-14 pt-[104px]">
      <Chrome page={page} />
      {children}
    </div>
  );
}

export function Heading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-[56px] font-semibold leading-none tracking-[-0.04em]">{title}</h2>
      {lead && <p className="text-[22px] text-zinc-600">{lead}</p>}
    </div>
  );
}

export function CodeBlock({ children, size = 'text-base' }: { children: ReactNode; size?: string }) {
  return <pre className={`min-w-0 flex-1 overflow-hidden whitespace-pre rounded-2xl bg-zinc-900 px-8 py-7 font-mono leading-[1.65] text-zinc-200 ${size}`}>{children}</pre>;
}

export const Accent = ({ children }: { children: ReactNode }) => <span className="text-amber-400">{children}</span>;
export const Dim = ({ children }: { children: ReactNode }) => <span className="text-zinc-400">{children}</span>;
export const Str = ({ children }: { children: ReactNode }) => <span className="text-green-300">{children}</span>;

type Direction = 'right' | 'left' | 'down' | 'up';
interface Geometry { path: string; w: number; h: number; dx: number; dy: number }

const GEOMETRY: Record<Direction, (n: number, tip: number) => Geometry> = {
  right: (n, tip) => ({ path: `M 0 4 L ${n - tip} 4`, w: n, h: 8, dx: 0, dy: -4 }),
  left: (n, tip) => ({ path: `M ${n} 4 L ${tip} 4`, w: n, h: 8, dx: 0, dy: -4 }),
  down: (n, tip) => ({ path: `M 4 0 L 4 ${n - tip}`, w: 8, h: n, dx: -4, dy: 0 }),
  up: (n, tip) => ({ path: `M 4 ${n} L 4 ${tip}`, w: 8, h: n, dx: -4, dy: 0 }),
};

export function Arrow({ x, y, length, dir, head = true, dark = false }: { x: number; y: number; length: number; dir: Direction; head?: boolean; dark?: boolean }) {
  const g = GEOMETRY[dir](length, head ? 4 : 0);
  const color = dark ? '#18181b' : '#a1a1aa';
  const id = `arrow-${x}-${y}-${dir}`;
  return (
    <svg width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true" className="absolute overflow-visible" style={{ left: x + g.dx, top: y + g.dy }} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      {head && <defs><marker id={id} orient="auto" markerWidth="5" markerHeight="5" refX="2" refY="2" overflow="visible"><path d="M0 0 L4 2 L0 4 Z" fill={color} stroke="none" /></marker></defs>}
      <path d={g.path} markerEnd={head ? `url(#${id})` : undefined} />
    </svg>
  );
}

export function Box({ x, y, w, h, dark = false, children }: { x: number; y: number; w: number; h: number; dark?: boolean; children: ReactNode }) {
  return (
    <div className={`absolute flex items-center justify-center rounded-[14px] p-2.5 text-center ${dark ? 'bg-zinc-900 text-zinc-50' : 'border border-zinc-200 bg-white'}`} style={{ left: x, top: y, width: w, height: h }}>
      <span>{children}</span>
    </div>
  );
}
