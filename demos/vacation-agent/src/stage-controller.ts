import { randomUUID } from 'node:crypto';
import { answerHuman, applyScenario, checkpointChoices, createStage, offerProblems, progressAfterInspection, type Offer, type QuestionKind, type ScenarioEvent, type StageState } from './stage-state.js';
export type StageObservation = { revision: number; view: 'results' | 'details' | 'review'; selected?: string; offers: Offer[] };
export type StageAction = { id: string; description: string };
export type StageHistory = { action: string; revision: number; result: string };
export type StageDecision = { state: StageState; page: StageObservation; history: StageHistory[]; actions: StageAction[] };
export type StageSelector = (decision: StageDecision, signal: AbortSignal) => Promise<string>;
export interface StageBrowser {
  start(): Promise<string>; sync(state: StageState): Promise<void>; observe(): Promise<StageObservation>; act(id: string): Promise<void>; close(): Promise<void>;
}
export const QUESTIONS: Record<QuestionKind, string> = {
  budget: 'הרכב הנוסעים השתנה או שאין התאמה לתקציב. מה התקציב הכולל המאושר כעת לטיסה ולמלון לכל הנוסעים?',
  destination: 'כל היעדים באתר השתנו לאיראן. האם לבחון יעדים אלה במסגרת הסיפור הבדיוני? דרישות הביטול, התקציב והנוסעים נשמרות; אין כאן המלצת נסיעה אמיתית.',
  cancellation: 'בהצעה יש סתירה לדרישת הביטול המקורית. האם לוותר במפורש על ביטול לטיסה ולמלון, לשמור עליו ולחפש חלופה, או להשוות חלופות עם ביטול?',
  constraints: 'נדרשת הבהרה כדי להתקדם בלי להניח הרשאה. מה חשוב לבדוק או להשוות בהמשך? לשינוי תקציב יש לבחור שאלת תקציב; טקסט חופשי אינו מבטל דרישות קשיחות.',
};
export function stageActions(s: StageState, page: StageObservation, stage: number): StageAction[] {
  const actions: StageAction[] = (s.budgetPending ? [] : page.offers).filter(o => o.available).map(o => ({ id: `inspect:${o.id}`, description: `Read ${o.hotel} in ${o.destination}, total ${o.totalNis} NIS including flight and hotel. Read fine print before review.` }));
  actions.push({ id: 'ask:budget', description: 'Ask the traveler for an explicit total budget. Required after travelers join; also use if no offer fits.' },
    { id: 'ask:constraints', description: 'Ask the human for clarification when preferences, facts or authority are unclear; never invent approval.' });
  if (s.destinationPending) actions.push({ id: 'ask:destination', description: 'Ask informed permission to explore the fictional changed Iranian destinations; existing vacation intent does not approve a specific new destination.' });
  if (needsCancellationQuestion(s, page)) actions.push({ id: 'ask:cancellation', description: 'Surface the nonrefundable fine print conflicting with original cancellation for BOTH flight and hotel. Ask waive, retain or compare; do not waive yourself.' });
  actions.push(...reviewActions(s, page, stage));
  return actions;
}
function reviewActions(s: StageState, page: StageObservation, stage: number): StageAction[] {
  if (stage < 4 || page.view !== 'details') return [];
  const current = page.offers.find(o => o.id === page.selected);
  if (!current || offerProblems(current, s).length) return [];
  return [{ id: `review:${current.id}`, description: 'All approved conditions match. Show final booking REVIEW only. Never reserve, pay or book.' }];
}
function needsCancellationQuestion(s: StageState, page: StageObservation): boolean {
  return page.offers.some(o => !o.refundableFlight || !o.refundableHotel) && (s.requirements.cancellation.flight || s.requirements.cancellation.hotel);
}
async function bounded<T>(task: Promise<T>, signal: AbortSignal, timeoutMs = 30000): Promise<T> {
  signal.throwIfAborted();
  let timer: ReturnType<typeof setTimeout> | undefined; let cancel: (() => void) | undefined;
  try { return await Promise.race([task, new Promise<never>((_resolve, reject) => {
    cancel = () => reject(new Error('stopped')); signal.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => reject(new Error('operation_timeout')), timeoutMs);
  })]); } finally { clearTimeout(timer); if (cancel) signal.removeEventListener('abort', cancel); }
}
export class StageController {
  readonly state = createStage(); readonly history: StageHistory[] = [];
  status: 'idle' | 'starting' | 'running' | 'paused' | 'checkpoint' | 'question' | 'review' | 'stopped' | 'error' = 'idle';
  checkpoint?: { id: string; number: number; choices: ReturnType<typeof checkpointChoices> };
  question?: { id: string; kind: QuestionKind; text: string };
  liveViewUrl?: string; error?: string; stage = 0; decisions = 0;
  private readonly abort = new AbortController(); private busy = false; private pauseRequested = false;
  constructor(private readonly browser: StageBrowser, private readonly select: StageSelector) {}
  async start(): Promise<void> {
    if (this.status !== 'idle') throw new Error('Already started'); this.status = 'starting';
    try {
      this.liveViewUrl = await bounded(this.browser.start(), this.abort.signal);
      this.abort.signal.throwIfAborted(); await bounded(this.browser.sync(this.state), this.abort.signal);
      this.status = 'running';
    } catch (e) { if (!this.abort.signal.aborted) { this.status = 'error'; this.error = errorText(e); } await this.browser.close(); }
  }
  pause(): void { this.pauseRequested = true; }
  resume(): void {
    if (this.status !== 'paused') throw new Error('Only a manual pause can resume; answer the pending vote or question first');
    this.pauseRequested = false; this.status = 'running';
  }
  vote(id: string, kind: ScenarioEvent): void {
    const existing = this.state.events.find(e => e.id === id);
    if (existing) { if (existing.kind !== kind) throw new Error('Checkpoint already resolved differently'); return; }
    if (this.status !== 'checkpoint' || this.checkpoint?.id !== id || !this.checkpoint.choices.some(c => c.id === kind)) throw new Error('Stale or invalid checkpoint');
    const number = this.checkpoint.number; const selected = this.history.at(-1)?.action.split(':')[1];
    applyScenario(this.state, id, kind, selected); this.stage = number; this.checkpoint = undefined; this.status = 'running';
  }
  answer(id: string, answer: Record<string, unknown>): void {
    if (this.status !== 'question' || this.question?.id !== id) throw new Error('Stale or missing human question');
    answerHuman(this.state, this.question.kind, answer); this.question = undefined; this.status = 'running';
  }
  async stop(): Promise<void> {
    this.abort.abort(); this.status = 'stopped'; this.liveViewUrl = undefined;
    this.checkpoint = undefined; this.question = undefined; await this.browser.close();
  }
  private afterInspection(selected: string): void {
    const progress = progressAfterInspection(this.state, this.stage, selected);
    this.stage = progress.stage; this.checkpoint = progress.checkpoint;
    if (this.checkpoint) this.status = 'checkpoint';
  }
  async pump(): Promise<void> {
    if (this.busy || this.status !== 'running') return;
    this.busy = true;
    try { await this.runSteps(); }
    catch (e) { await this.fail(e); }
    finally { this.busy = false; }
  }
  private async runSteps(): Promise<void> {
    while (this.status === 'running') {
      this.abort.signal.throwIfAborted();
      if (this.pauseRequested) { this.status = 'paused'; return; }
      if (this.decisions >= 60) throw new Error('Decision limit reached (60). Inspect history and reset explicitly.');
      await this.turn();
    }
  }
  private async decision(): Promise<{ id: string; revision: number }> {
    await bounded(this.browser.sync(this.state), this.abort.signal);
    const page = await bounded(this.browser.observe(), this.abort.signal);
    if (page.revision !== this.state.revision) throw new Error('Page/world revision mismatch');
    const actions = stageActions(this.state, page, this.stage); const revision = this.state.revision;
    this.decisions += 1;
    const input = structuredClone({ state: this.state, page, history: this.history, actions });
    const id = await bounded(this.select(input, this.abort.signal), this.abort.signal);
    this.abort.signal.throwIfAborted();
    if (!actions.some(a => a.id === id)) throw new Error('Selector returned an unavailable action');
    return { id, revision };
  }
  private async turn(): Promise<void> {
    const { id, revision } = await this.decision();
    if (this.pauseRequested) { this.status = 'paused'; return; }
    if (revision !== this.state.revision) { this.history.push({ action: id, revision, result: 'world_changed; decision discarded' }); return; }
    if (id.startsWith('ask:')) { this.ask(id, revision); return; }
    await this.execute(id, revision);
  }
  private ask(id: string, revision: number): void {
    const kind = id.slice(4) as QuestionKind;
    this.state.conversation.push({ role: 'agent', text: QUESTIONS[kind] });
    this.question = { id: randomUUID(), kind, text: QUESTIONS[kind] }; this.status = 'question';
    this.history.push({ action: id, revision, result: 'waiting for human; no browser action' });
  }
  private async execute(id: string, revision: number): Promise<void> {
    const fresh = await bounded(this.browser.observe(), this.abort.signal);
    this.abort.signal.throwIfAborted();
    if (fresh.revision !== revision) throw new Error('Page changed before action');
    if (id.startsWith('review:')) this.validateReview(id, fresh);
    await bounded(this.browser.act(id), this.abort.signal);
    this.abort.signal.throwIfAborted();
    this.history.push({ action: id, revision, result: 'completed' });
    if (id.startsWith('review:')) { this.status = 'review'; return; }
    this.afterInspection(id.slice(8));
  }
  private validateReview(id: string, page: StageObservation): void {
    const offer = page.offers.find(o => o.id === id.slice(7));
    if (this.stage < 4 || page.view !== 'details' || !offer) throw new Error('Booking review rejected by current policy');
    if (page.selected !== offer.id || offerProblems(offer, this.state).length) throw new Error('Booking review rejected by current policy');
  }
  private async fail(e: unknown): Promise<void> {
    if (this.abort.signal.aborted) return;
    this.status = 'error'; this.error = errorText(e); this.liveViewUrl = undefined;
    this.history.push({ action: 'error', revision: this.state.revision, result: this.error });
    this.abort.abort(); await this.browser.close();
  }
  snapshot() {
    return structuredClone({ state: this.state, history: this.history, status: this.status, checkpoint: this.checkpoint, question: this.question, stage: this.stage, decisions: this.decisions, error: this.error });
  }
}
function errorText(e: unknown): string {
  const message = e instanceof Error ? e.message : 'operation_failed';
  if (/https?:|wss?:|token|credential|key|signature/i.test(message)) return 'Provider operation failed. Check service access locally; sensitive details omitted.';
  return message.slice(0, 300);
}
