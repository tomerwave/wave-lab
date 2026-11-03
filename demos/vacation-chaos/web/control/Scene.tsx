import type { ReactNode } from 'react';

export function Primary({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="self-start rounded-lg bg-zinc-900 px-10 py-3.5 text-xl font-semibold text-white hover:bg-zinc-800">{children}</button>;
}

export function Secondary({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="self-start rounded-lg border border-zinc-300 bg-white px-7 py-3 text-lg font-medium hover:bg-zinc-100">{children}</button>;
}

export function Kicker({ children, tone = 'text-zinc-500' }: { children: ReactNode; tone?: string }) {
  return <p className={`text-base font-medium ${tone}`}>{children}</p>;
}

export function Title({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return <h2 className={`${small ? 'text-[clamp(26px,4.6vh,44px)] leading-tight' : 'text-[clamp(36px,6.6vh,68px)] leading-none'} font-semibold tracking-tighter`}>{children}</h2>;
}
