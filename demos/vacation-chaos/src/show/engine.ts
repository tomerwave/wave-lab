import { randomUUID } from 'node:crypto';
import { CHAOS_POOL, DESTINATIONS, RULES, TWISTS } from './twists.js';
import { SCREEN_MS, START_BUDGET, freshMission, freshSite, type Ask, type AskKind, type Mission, type Pace, type RunMode, type SiteMode, type VoteOption } from './types.js';

export const VOTE_MS = 30_000;
export const HEADS_UP_MS = 6_000;
export const THINK_DELAY: Record<Pace, number> = { story: 2500, turbo: 0 };
export const SITE_DELAY: Record<Pace, number> = { story: 600, turbo: 0 };

export const CHECKPOINTS = [
  { label: 'Where?', kind: 'vote' }, { label: 'One rule', kind: 'vote' }, { label: 'Brief', kind: 'agent' },
  { label: 'Flights', kind: 'agent' }, { label: 'Oil shock', kind: 'auto' }, { label: 'Twist', kind: 'vote' },
  { label: 'Book flight', kind: 'agent' }, { label: 'Intern deploy', kind: 'auto' }, { label: 'Twist', kind: 'vote' },
  { label: 'Hotel', kind: 'agent' }, { label: 'Twist', kind: 'vote' }, { label: 'Checkout', kind: 'agent' },
  { label: 'Turbo', kind: 'finale' },
] as const;

const CHAOS_CHECKPOINTS = [5, 10];

export type EventType = 'thought' | 'step' | 'page' | 'click' | 'booking' | 'twist' | 'vote' | 'checkpoint' | 'ask' | 'answer' | 'finish' | 'stopped' | 'pause' | 'telemetry' | 'reset';
export interface ShowEvent { seq: number; at: number; type: EventType; data: Record<string, unknown> }
export type VoteTarget = 'destination' | 'rule' | 'chaos';
export interface ActiveVote { id: string; target: VoteTarget; question: string; options: VoteOption[]; tally: Record<string, number>; total: number; opensAt: number; closesAt: number }
export interface Booking { label: string; price: number; ref?: string }
export interface Telemetry { toolCalls: number; inputTokens: number; outputTokens: number; latencyMs: number; model: string | null }
export interface Haggle { hotelId: string; offer: number; accepted: boolean; reply: string }
export interface Cart { insurance: boolean | null; haggle: Haggle | null }
export interface ToolReply { mission: Mission; inbox: string[]; progress: { booked: Snapshot['booked']; lastPage: string } }

export interface Snapshot {
  runMode: RunMode; pace: Pace; pausedAt: number | null; checkpoint: number; mission: Mission; site: SiteMode; vote: ActiveVote | null;
  lastResult: { question: string; winner: string; total: number } | null;
  booked: { flight: Booking | null; hotel: Booking | null }; applied: string[]; route: string; lastClick: string | null;
  thought: string | null; pendingAsk: Ask | null; approvedOverspend: boolean; finished: string | null; stopped: string | null;
  telemetry: Telemetry; cart: Cart; chaosVotes: number; audience: number; events: ShowEvent[];
}

interface ShowOptions { now?: () => number; sleep?: (ms: number) => Promise<void>; random?: () => number }

const QUESTIONS: Record<VoteTarget, string> = {
  destination: 'Where is Tomer going?',
  rule: 'Pick his one rule',
  chaos: 'What happens next?',
};

export class Show {
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private state!: Snapshot;
  private voters = new Map<string, string>();
  private audience = new Set<string>();
  private startBudget = START_BUDGET;
  private inbox: string[] = [];
  private listeners = new Set<(s: Snapshot) => void>();
  private waiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
  private pendingAnswer: { promise: Promise<string>; resolve: (text: string) => void; reject: (e: Error) => void } | null = null;
  private autoVotesOn = true;
  private token: string | null = null;
  private seq = 0;
  private holdUntil = 0;
  lastWinners: string[] = [];

  constructor(opts: ShowOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.random = opts.random ?? Math.random;
    this.reset('idle');
  }

  snapshot(): Snapshot {
    return structuredClone({ ...this.state, events: this.state.events.slice(-40) });
  }

  get site(): SiteMode { return this.state.site; }
  get mission(): Mission { return this.state.mission; }
  get clock(): number { return this.now(); }
  get cart(): Cart { return this.state.cart; }
  get chaosVotes(): number { return this.state.chaosVotes; }
  get applied(): string[] { return this.state.applied; }
  get booked(): Snapshot['booked'] { return this.state.booked; }
  get approvedOverspend(): boolean { return this.state.approvedOverspend; }

  sitePause(): Promise<void> {
    return this.sleep(SITE_DELAY[this.state.pace]);
  }

  onChange(fn: (s: Snapshot) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reset(runMode: RunMode): void {
    const pace = this.state?.pace ?? 'story';
    this.state = {
      runMode, pace, pausedAt: null, checkpoint: 0, mission: freshMission(this.startBudget), site: freshSite(), vote: null, lastResult: null,
      booked: { flight: null, hotel: null }, applied: [], route: '/site', lastClick: null, thought: null,
      pendingAsk: null, approvedOverspend: false, finished: null, stopped: null,
      telemetry: { toolCalls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, model: null },
      cart: { insurance: null, haggle: null }, chaosVotes: 0, audience: this.audience.size, events: [],
    };
    this.voters.clear();
    this.inbox = [];
    this.autoVotesOn = true;
    this.token = null;
    this.holdUntil = 0;
    this.endRun();
    this.record('reset', { runMode });
  }

  get autoVotes(): boolean { return this.autoVotesOn; }
  setAutoVotes(on: boolean): void { this.autoVotesOn = on; }
  get agentToken(): string | null { return this.token; }

  issueAgentToken(): string {
    this.token = randomUUID();
    return this.token;
  }

  private endRun(): void {
    const ended = new Error('run ended');
    this.waiters.splice(0).forEach((w) => w.reject(ended));
    this.pendingAnswer?.reject(ended);
    this.pendingAnswer?.promise.catch(() => undefined);
    this.pendingAnswer = null;
  }

  setPace(pace: Pace): void { this.state.pace = pace; this.changed(); }

  pause(): void {
    if (this.state.pausedAt !== null) return;
    this.state.pausedAt = this.now();
    this.record('pause', { paused: true });
  }

  resume(): void {
    if (this.state.pausedAt === null) return;
    const pausedFor = this.now() - this.state.pausedAt;
    if (this.state.vote) this.state.vote.closesAt += pausedFor;
    this.holdUntil += pausedFor;
    this.state.pausedAt = null;
    this.record('pause', { paused: false });
  }

  private holdFor(ms: number): void {
    if (this.state.pace === 'turbo') return;
    this.holdUntil = Math.max(this.holdUntil, this.now()) + ms + SCREEN_MS.rest;
  }

  setBudget(budget: number): void {
    if (!Number.isInteger(budget) || budget < 100 || budget > 100_000 || this.state.mission.ready) return;
    this.startBudget = budget;
    this.state.mission.budget = budget;
    this.changed();
  }

  join(voterId: string): void {
    if (this.audience.has(voterId)) return;
    this.audience.add(voterId);
    this.state.audience = this.audience.size;
    this.changed();
  }
  setRunMode(runMode: RunMode): void { this.state.runMode = runMode; this.changed(); }

  beginOpening(): void {
    this.checkpoint(0);
    this.openVote('destination');
  }

  prefillMission(destination: string, rule: string | null): void {
    this.state.mission.destination = destination;
    this.applyRule(rule);
    this.markReady();
  }

  openVote(target: VoteTarget, optionIds?: string[]): ActiveVote | null {
    const options = this.optionsFor(target, optionIds);
    if (!options.length) return null;
    const vote: ActiveVote = {
      id: `${target}-${this.now()}`, target, question: QUESTIONS[target], options,
      tally: Object.fromEntries(options.map((o) => [o.id, 0])), total: 0, opensAt: this.now() + HEADS_UP_MS, closesAt: this.now() + HEADS_UP_MS + VOTE_MS,
    };
    this.voters.clear();
    this.state.vote = vote;
    if (target === 'chaos') this.state.chaosVotes += 1;
    if (target === 'chaos') this.checkpoint(CHAOS_CHECKPOINTS.find((i) => i > this.state.checkpoint) ?? 10);
    this.record('vote', { phase: 'open', target, options: options.map((o) => o.label) });
    return vote;
  }

  castVote(voterId: string, optionId: string): void {
    const vote = this.state.vote;
    if (!vote || !(optionId in vote.tally)) return;
    const previous = this.voters.get(voterId);
    if (previous) vote.tally[previous]! -= 1;
    else vote.total += 1;
    vote.tally[optionId]! += 1;
    this.voters.set(voterId, optionId);
    this.changed();
  }

  extendVote(ms: number): void {
    if (this.state.vote) { this.state.vote.closesAt += ms; this.changed(); }
  }

  closeVote(): string | null {
    const vote = this.state.vote;
    if (!vote) return null;
    const winner = vote.options.reduce((best, o) => (vote.tally[o.id]! > vote.tally[best.id]! ? o : best), vote.options[0]!);
    this.state.vote = null;
    this.state.lastResult = { question: vote.question, winner: winner.label, total: vote.total };
    this.record('vote', { phase: 'closed', target: vote.target, winner: winner.label, winnerId: winner.id, total: vote.total });
    this.resolveVote(vote.target, winner.id);
    return winner.id;
  }

  tick(): void {
    try {
      if (this.state.vote && this.state.pausedAt === null && this.now() >= this.state.vote.closesAt) this.closeVote();
    } catch (error) {
      this.state.vote = null;
      this.record('step', { kind: 'Error', text: error instanceof Error ? error.message : 'vote failed' });
    }
  }

  applyTwist(id: string, by: 'crowd' | 'world' = 'world'): void {
    const twist = TWISTS[id];
    if (!twist || this.state.applied.includes(id)) return;
    this.holdFor(SCREEN_MS.twist);
    twist.apply(this.state.mission, this.state.site, Math.max(this.now(), this.holdUntil));
    this.state.applied.push(id);
    this.inbox.push(twist.inbox);
    this.record('twist', { id, label: twist.label, blurb: twist.blurb, by });
  }

  checkpoint(index: number): void {
    if (index <= this.state.checkpoint && this.state.events.some((e) => e.type === 'checkpoint')) return;
    this.state.checkpoint = Math.min(index, CHECKPOINTS.length - 1);
    this.record('checkpoint', { index: this.state.checkpoint, label: CHECKPOINTS[this.state.checkpoint]!.label });
  }

  record(type: EventType, data: Record<string, unknown>): void {
    this.state.events.push({ seq: ++this.seq, at: this.now(), type, data });
    if (this.state.events.length > 400) this.state.events.splice(0, 100);
    if (type === 'page') this.state.route = String(data.route);
    if (type === 'click') this.state.lastClick = String(data.label);
    this.changed();
  }

  async think(text: string): Promise<ToolReply> {
    this.state.telemetry.toolCalls += 1;
    this.state.thought = text;
    this.record('thought', { text });
    return this.reply(THINK_DELAY[this.state.pace]);
  }

  async checkInbox(): Promise<ToolReply> {
    this.state.telemetry.toolCalls += 1;
    this.record('step', { kind: 'Inbox', text: 'Checked for new instructions' });
    return this.reply(0);
  }

  ask(question: string, kind: AskKind = 'question', options: string[] = []): Promise<string> {
    this.state.telemetry.toolCalls += 1;
    if (this.pendingAnswer) return this.pendingAnswer.promise;
    this.state.pendingAsk = { question, kind, options };
    this.record('ask', { question, kind, options });
    let resolve!: (text: string) => void, reject!: (e: Error) => void;
    const promise = new Promise<string>((res, rej) => { resolve = res; reject = rej; });
    this.pendingAnswer = { promise, resolve, reject };
    return promise;
  }

  answer(text: string, approveSpend = false): void {
    if (approveSpend) this.state.approvedOverspend = true;
    this.state.pendingAsk = null;
    this.record('answer', { text, approveSpend });
    this.pendingAnswer?.resolve(text);
    this.pendingAnswer = null;
  }

  book(item: 'flight' | 'hotel', label: string, price: number, ref?: string): void {
    this.state.booked[item] = { label, price, ref };
    this.record('booking', { item, label, price, ref });
    this.holdFor(SCREEN_MS.booking);
  }

  agentStopped(reason: string): void {
    if (this.state.finished || this.state.stopped) return;
    this.state.stopped = reason;
    this.record('stopped', { reason });
  }

  finish(summary: string): void {
    this.state.finished = summary;
    this.lastWinners = [...this.state.applied];
    this.record('finish', { summary });
  }

  addTelemetry(t: Partial<Telemetry>): void {
    const tel = this.state.telemetry;
    tel.inputTokens += t.inputTokens ?? 0;
    tel.outputTokens += t.outputTokens ?? 0;
    tel.latencyMs += t.latencyMs ?? 0;
    if (t.model) tel.model = t.model;
    this.changed();
  }

  spent(): number {
    return (this.state.booked.flight?.price ?? 0) + (this.state.booked.hotel?.price ?? 0);
  }

  async waitUntilFree(): Promise<void> {
    while (!this.state.mission.ready || this.state.vote || this.state.pausedAt !== null) await new Promise<void>((resolve, reject) => this.waiters.push({ resolve, reject }));
    await this.waitForScreen();
  }

  async waitForScreen(): Promise<void> {
    const held = this.holdUntil - this.now();
    if (held > 0) await this.sleep(held);
  }

  private async reply(delayMs: number): Promise<ToolReply> {
    await this.waitUntilFree();
    await this.sleep(delayMs);
    const inbox = this.inbox.splice(0);
    return { mission: structuredClone(this.state.mission), inbox, progress: { booked: structuredClone(this.state.booked), lastPage: this.state.route } };
  }

  private optionsFor(target: VoteTarget, optionIds?: string[]): VoteOption[] {
    if (target === 'destination') return DESTINATIONS;
    if (target === 'rule') return RULES;
    return this.chaosOptions(optionIds);
  }

  private chaosOptions(optionIds?: string[]): VoteOption[] {
    const ids = optionIds?.length ? optionIds : this.pickChaos();
    return ids.map((id) => ({ id, label: TWISTS[id]!.label, blurb: TWISTS[id]!.blurb }));
  }

  private pickChaos(): string[] {
    const flightBooked = this.state.booked.flight !== null;
    const pool = CHAOS_POOL.filter((id) => !this.state.applied.includes(id) && !(flightBooked && TWISTS[id]!.flightOnly));
    const picked: string[] = [];
    while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0]!);
    return picked;
  }

  private resolveVote(target: VoteTarget, winner: string): void {
    if (target !== 'chaos') this.holdFor(SCREEN_MS.result);
    if (target === 'destination') {
      this.state.mission.destination = winner;
      this.checkpoint(1);
      this.openVote('rule');
    } else if (target === 'rule') {
      this.applyRule(winner);
      this.markReady();
    } else {
      this.applyTwist(winner, 'crowd');
    }
  }

  private applyRule(rule: string | null): void {
    this.state.mission.rule = rule;
    if (rule === 'No red-eye flights') this.state.mission.nevers.push(rule);
    else if (rule) this.state.mission.musts.push(rule);
  }

  private markReady(): void {
    this.state.mission.ready = true;
    this.checkpoint(2);
    this.changed();
  }

  private changed(): void {
    const waiters = this.waiters.splice(0);
    waiters.forEach((w) => w.resolve());
    if (!this.listeners.size) return;
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}
