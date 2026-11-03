import { CHAOS_POOL, DESTINATIONS, RULES, TWISTS } from './twists.js';
import { freshMission, freshSite, type Mission, type Pace, type RunMode, type SiteMode, type VoteOption } from './types.js';

export const VOTE_MS = 30_000;
export const THINK_DELAY: Record<Pace, number> = { story: 2500, turbo: 0 };
export const SITE_DELAY: Record<Pace, number> = { story: 600, turbo: 0 };

export const CHECKPOINTS = [
  { label: 'Where?', kind: 'vote' }, { label: 'One rule', kind: 'vote' }, { label: 'Brief', kind: 'agent' },
  { label: 'Flights', kind: 'agent' }, { label: 'Oil shock', kind: 'auto' }, { label: 'Twist', kind: 'vote' },
  { label: 'Book flight', kind: 'agent' }, { label: 'Intern deploy', kind: 'auto' }, { label: 'Twist', kind: 'vote' },
  { label: 'Hotel', kind: 'agent' }, { label: 'Twist', kind: 'vote' }, { label: 'Checkout', kind: 'agent' },
  { label: 'Turbo', kind: 'finale' },
] as const;

const CHAOS_CHECKPOINTS = [5, 8, 10];

export type EventType = 'thought' | 'step' | 'page' | 'click' | 'booking' | 'twist' | 'vote' | 'checkpoint' | 'ask' | 'answer' | 'finish' | 'telemetry' | 'reset';
export interface ShowEvent { at: number; type: EventType; data: Record<string, unknown> }
export type VoteTarget = 'destination' | 'rule' | 'chaos';
export interface ActiveVote { id: string; target: VoteTarget; question: string; options: VoteOption[]; tally: Record<string, number>; total: number; closesAt: number }
export interface Booking { label: string; price: number }
export interface Telemetry { toolCalls: number; inputTokens: number; outputTokens: number; latencyMs: number; model: string | null }
export interface Haggle { hotelId: string; offer: number; accepted: boolean; reply: string }
export interface Cart { insurance: boolean; haggle: Haggle | null }
export interface ToolReply { mission: Mission; inbox: string[]; note?: string }

export interface Snapshot {
  runMode: RunMode; pace: Pace; checkpoint: number; mission: Mission; site: SiteMode; vote: ActiveVote | null;
  lastResult: { question: string; winner: string; total: number } | null;
  booked: { flight: Booking | null; hotel: Booking | null }; applied: string[]; route: string; lastClick: string | null;
  thought: string | null; pendingAsk: string | null; approvedOverspend: boolean; finished: string | null;
  telemetry: Telemetry; cart: Cart; chaosVotes: number; events: ShowEvent[];
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
  private inbox: string[] = [];
  private listeners = new Set<(s: Snapshot) => void>();
  private waiters: Array<() => void> = [];
  private askResolve: ((text: string) => void) | null = null;
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
      runMode, pace, checkpoint: 0, mission: freshMission(), site: freshSite(), vote: null, lastResult: null,
      booked: { flight: null, hotel: null }, applied: [], route: '/site', lastClick: null, thought: null,
      pendingAsk: null, approvedOverspend: false, finished: null,
      telemetry: { toolCalls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, model: null },
      cart: { insurance: false, haggle: null }, chaosVotes: 0, events: [],
    };
    this.voters.clear();
    this.inbox = [];
    this.askResolve = null;
    this.record('reset', { runMode });
  }

  setPace(pace: Pace): void { this.state.pace = pace; this.changed(); }
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

  openVote(target: VoteTarget, optionIds?: string[]): ActiveVote {
    const options = this.optionsFor(target, optionIds);
    const vote: ActiveVote = {
      id: `${target}-${this.now()}`, target, question: QUESTIONS[target], options,
      tally: Object.fromEntries(options.map((o) => [o.id, 0])), total: 0, closesAt: this.now() + VOTE_MS,
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
    this.record('vote', { phase: 'closed', target: vote.target, winner: winner.label, total: vote.total });
    this.resolveVote(vote.target, winner.id);
    return winner.id;
  }

  tick(): void {
    if (this.state.vote && this.now() >= this.state.vote.closesAt) this.closeVote();
  }

  applyTwist(id: string): void {
    const twist = TWISTS[id];
    if (!twist || this.state.applied.includes(id)) return;
    twist.apply(this.state.mission, this.state.site, this.now());
    this.state.applied.push(id);
    this.inbox.push(twist.inbox);
    this.record('twist', { id, label: twist.label, blurb: twist.blurb });
  }

  checkpoint(index: number): void {
    if (index <= this.state.checkpoint && this.state.events.some((e) => e.type === 'checkpoint')) return;
    this.state.checkpoint = Math.min(index, CHECKPOINTS.length - 1);
    this.record('checkpoint', { index: this.state.checkpoint, label: CHECKPOINTS[this.state.checkpoint]!.label });
  }

  record(type: EventType, data: Record<string, unknown>): void {
    this.state.events.push({ at: this.now(), type, data });
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

  ask(question: string): Promise<string> {
    this.state.telemetry.toolCalls += 1;
    this.state.pendingAsk = question;
    this.record('ask', { question });
    return new Promise((resolve) => { this.askResolve = resolve; });
  }

  answer(text: string, approveSpend = false): void {
    if (approveSpend) this.state.approvedOverspend = true;
    this.state.pendingAsk = null;
    this.record('answer', { text, approveSpend });
    this.askResolve?.(text);
    this.askResolve = null;
  }

  book(item: 'flight' | 'hotel', label: string, price: number): void {
    this.state.booked[item] = { label, price };
    this.record('booking', { item, label, price });
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
    while (!this.state.mission.ready || this.state.vote) await new Promise<void>((r) => this.waiters.push(r));
  }

  private async reply(delayMs: number): Promise<ToolReply> {
    await this.waitUntilFree();
    await this.sleep(delayMs);
    const inbox = this.inbox.splice(0);
    return { mission: structuredClone(this.state.mission), inbox };
  }

  private optionsFor(target: VoteTarget, optionIds?: string[]): VoteOption[] {
    if (target === 'destination') return DESTINATIONS;
    if (target === 'rule') return RULES;
    return this.chaosOptions(optionIds);
  }

  private chaosOptions(optionIds?: string[]): VoteOption[] {
    const ids = optionIds?.length ? optionIds : this.pickChaos();
    return ids.map((id) => ({ id, label: TWISTS[id]!.label }));
  }

  private pickChaos(): string[] {
    const pool = CHAOS_POOL.filter((id) => !this.state.applied.includes(id));
    const picked: string[] = [];
    while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(this.random() * pool.length), 1)[0]!);
    return picked;
  }

  private resolveVote(target: VoteTarget, winner: string): void {
    if (target === 'destination') {
      this.state.mission.destination = winner;
      this.checkpoint(1);
      this.openVote('rule');
    } else if (target === 'rule') {
      this.applyRule(winner);
      this.markReady();
    } else {
      this.applyTwist(winner);
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
    waiters.forEach((w) => w());
    if (!this.listeners.size) return;
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}
