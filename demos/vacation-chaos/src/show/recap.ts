import type { ShowEvent } from './engine.js';

export interface Choice { question: string; winner: string; votes: number; by: 'crowd' | 'world' }
export interface Recap { startedAt: number | null; endedAt: number | null; choices: Choice[]; jev: string[]; asks: string[]; pages: number; clicks: number; thoughts: number }
export interface RunInfo { sessionId: string; region: string; harnessId: string; runtimeId: string; memoryId: string }

export const freshRecap = (): Recap => ({ startedAt: null, endedAt: null, choices: [], jev: [], asks: [], pages: 0, clicks: 0, thoughts: 0 });

type Tracker = (recap: Recap, e: ShowEvent) => void;

const TRACKERS: Partial<Record<ShowEvent['type'], Tracker>> = {
  vote: (r, e) => {
    if (e.data.phase !== 'closed') return;
    r.choices.push({ question: String(e.data.question), winner: String(e.data.winner), votes: Number(e.data.total), by: 'crowd' });
  },
  twist: (r, e) => { if (e.data.by === 'world') r.choices.push({ question: 'The world', winner: String(e.data.label), votes: 0, by: 'world' }); },
  step: (r, e) => { if (e.data.kind === 'Jev') r.jev.push(String(e.data.text)); },
  ask: (r, e) => { r.asks.push(String(e.data.question)); },
  page: (r) => { r.pages += 1; },
  click: (r) => { r.clicks += 1; },
  thought: (r, e) => { r.thoughts += 1; r.startedAt ??= e.at; },
  finish: (r, e) => { r.endedAt = e.at; },
  stopped: (r, e) => { r.endedAt = e.at; },
};

export function track(recap: Recap, e: ShowEvent): void {
  TRACKERS[e.type]?.(recap, e);
}

const text = (v: unknown) => (typeof v === 'string' && v.length <= 200 ? v : '');

export function runInfoFrom(body: Record<string, unknown>): RunInfo | null {
  const info = { sessionId: text(body.sessionId), region: text(body.region), harnessId: text(body.harnessId), runtimeId: text(body.runtimeId), memoryId: text(body.memoryId) };
  return info.sessionId && info.region ? info : null;
}
