import { useEffect, useRef, useState } from 'react';
import type { ShowEvent, Snapshot } from '../../src/show/engine';
import { money } from './format';

export interface Moment { kicker: string; title: string; text: string; foot: string; at: number; ms: number }

export interface Moments { seen: number | null; queue: Moment[]; current: Moment | null; until: number; restUntil: number }

const MOMENT_MS = 5000;
const TWIST_MS = 7000;
const BOOKING_MS = 3500;
const REST_MS = 3000;
const STALE_MS = 30000;
const BACK = 'Back to the agent';

export const emptyMoments = (): Moments => ({ seen: null, queue: [], current: null, until: 0, restUntil: 0 });

export function freshEvents(state: Moments, events: ShowEvent[]): ShowEvent[] {
  const seen = state.seen;
  state.seen = events.at(-1)?.seq ?? seen ?? 0;
  return seen === null ? [] : events.filter((e) => e.seq > seen);
}

const VOTE_KICKERS: Record<string, string> = { destination: 'The crowd chose', rule: 'His one rule' };

function voteText(target: string, winner: string, s: Snapshot): string {
  if (target === 'destination') return `Tomer is going to ${winner}.`;
  if (target === 'rule') return `Mission locked: ${s.mission.destination}, ${money(s.mission.budget)}, ${s.mission.nights} nights. Agent, go.`;
  return '';
}

function voteMoment(e: ShowEvent, s: Snapshot): Moment {
  const { target, winner, total } = e.data as { target: string; winner: string; total: number };
  return {
    kicker: total === 0 ? 'Nobody voted, so the universe chose' : VOTE_KICKERS[target] ?? '',
    title: winner, text: voteText(target, winner, s),
    foot: target === 'destination' ? 'Next: his one rule' : BACK, at: e.at, ms: MOMENT_MS,
  };
}

function bookingMoment(e: ShowEvent): Moment | null {
  const { item, label, price } = e.data as { item: string; label: string; price: number };
  if (item === 'trip') return null;
  return { kicker: `The agent booked the ${item}`, title: label, text: money(price), foot: BACK, at: e.at, ms: BOOKING_MS };
}

function twistMoment(state: Moments, e: ShowEvent): void {
  const { label, kicker, headline, effect, by } = e.data as Record<string, string>;
  const foot = by === 'crowd' ? `Chosen by the crowd: ${label}` : BACK;
  state.queue.push({ kicker, title: headline, text: effect, foot, at: e.at, ms: TWIST_MS });
}

const BUILDERS: Partial<Record<ShowEvent['type'], (state: Moments, e: ShowEvent, s: Snapshot) => void>> = {
  reset: (state) => Object.assign(state, { queue: [], current: null }),
  twist: twistMoment,
  booking: (state, e) => { const m = bookingMoment(e); if (m) state.queue.push(m); },
  vote: (state, e, s) => { if (e.data.phase === 'closed' && e.data.target !== 'chaos') state.queue.push(voteMoment(e, s)); },
};

export function absorb(state: Moments, s: Snapshot): void {
  for (const e of freshEvents(state, s.events)) BUILDERS[e.type]?.(state, e, s);
}

export function advance(state: Moments, localNow: number, serverNow: number): Moment | null {
  if (state.current && localNow < state.until) return state.current;
  if (state.current) Object.assign(state, { current: null, restUntil: localNow + REST_MS });
  if (localNow < state.restUntil) return null;
  state.queue = state.queue.filter((m) => serverNow - m.at < STALE_MS);
  state.current = state.queue.shift() ?? null;
  if (state.current) state.until = localNow + state.current.ms;
  return state.current;
}

export function useMoments(snap: Snapshot, offset: number, now: number): Moment | null {
  const state = useRef<Moments>(emptyMoments());
  const [current, setCurrent] = useState<Moment | null>(null);
  useEffect(() => absorb(state.current, snap), [snap]);
  useEffect(() => setCurrent(advance(state.current, now, now + offset)), [now, offset, snap]);
  return current;
}
