import { useEffect, useRef, useState } from 'react';
import type { ShowEvent, Snapshot } from '../../src/show/engine';
import { POSTCARDS, RULE_QUIPS, TWISTS } from '../../src/show/twists';
import { money } from './format';

export type Look = 'news' | 'message' | 'alert' | 'status' | 'post' | 'postcard' | 'rule' | 'booking';

export interface Moment { look: Look; ref: string; kicker: string; title: string; text: string; foot: string; at: number; ms: number }

export interface Moments { seen: number | null; queue: Moment[]; current: Moment | null; until: number; restUntil: number }

const MOMENT_MS = 5000;
const TWIST_MS = 8000;
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

function voteMoment(e: ShowEvent): Moment {
  const { target, winner, winnerId, total } = e.data as Record<string, string>;
  const base = { ref: winnerId, title: winner, at: e.at, ms: MOMENT_MS };
  const kicker = (fallback: string) => (Number(total) === 0 ? 'Nobody voted, so the universe chose' : fallback);
  if (target === 'destination') {
    return { ...base, look: 'postcard', kicker: kicker('Tomer is going to'), text: POSTCARDS[winnerId]?.headline ?? '', foot: 'Next: his one rule', ms: TWIST_MS };
  }
  return { ...base, look: 'rule', kicker: kicker('His one rule'), text: RULE_QUIPS[winnerId] ?? '', foot: BACK };
}

function bookingMoment(e: ShowEvent): Moment | null {
  const { item, label, price } = e.data as { item: string; label: string; price: number };
  if (item === 'trip') return null;
  return { look: 'booking', ref: item, kicker: `The agent booked the ${item}`, title: label, text: money(price), foot: BACK, at: e.at, ms: BOOKING_MS };
}

function twistMoment(state: Moments, e: ShowEvent): void {
  const { id, label, by } = e.data as Record<string, string>;
  const twist = TWISTS[id];
  if (!twist) return;
  const foot = by === 'crowd' ? `Chosen by the crowd: ${label}` : BACK;
  state.queue.push({ look: twist.look, ref: id, kicker: twist.kicker, title: twist.headline, text: twist.effect, foot, at: e.at, ms: TWIST_MS });
}

const BUILDERS: Partial<Record<ShowEvent['type'], (state: Moments, e: ShowEvent) => void>> = {
  reset: (state) => Object.assign(state, { queue: [], current: null }),
  twist: twistMoment,
  booking: (state, e) => { const m = bookingMoment(e); if (m) state.queue.push(m); },
  vote: (state, e) => { if (e.data.phase === 'closed' && e.data.target !== 'chaos') state.queue.push(voteMoment(e)); },
};

export function absorb(state: Moments, s: Snapshot): void {
  for (const e of freshEvents(state, s.events)) BUILDERS[e.type]?.(state, e);
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
