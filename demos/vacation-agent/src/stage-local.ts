import { randomUUID } from 'node:crypto';
import { QUESTIONS, type StageHistory } from './stage-controller.js';
import { answerHuman, applyScenario, createStage, offersFor, offerProblems, progressAfterInspection, type StageCheckpoint, type QuestionKind, type ScenarioEvent } from './stage-state.js';
export class LocalStageController {
  readonly state = createStage(); readonly history: StageHistory[] = []; readonly liveViewUrl = undefined;
  status: 'running' | 'paused' | 'checkpoint' | 'question' | 'review' | 'stopped' = 'stopped';
  stage = 0; checkpoint?: StageCheckpoint; question?: { id: string; kind: QuestionKind; text: string };
  selected?: string; view: 'results' | 'details' | 'review' = 'results';
  get decisions(): number { return this.history.length; }
  async start(): Promise<void> { this.status = 'running'; }
  async pump(): Promise<void> { return undefined; }
  async stop(): Promise<void> { this.status = 'stopped'; this.question = undefined; this.checkpoint = undefined; }
  pause(): void { if (this.status === 'running') this.status = 'paused'; }
  resume(): void { if (this.status !== 'paused') throw new Error('Resolve the current human gate'); this.status = 'running'; }
  action(id: string, revision: number): void {
    if (this.status !== 'running') throw new Error('Local rehearsal is paused');
    if (id === 'back') { this.view = 'results'; return; }
    if (revision !== this.state.revision) throw new Error('Stale local action');
    if (id.startsWith('ask:')) { this.ask(id.slice(4) as QuestionKind); return; }
    this.offerAction(id);
  }
  private offerAction(id: string): void {
    const [kind, selected] = id.split(':'); const offer = offersFor(this.state).find(o => o.id === selected);
    if (!offer || !['inspect', 'review'].includes(kind!)) throw new Error('Unknown local offer action');
    if (kind === 'review') { this.review(offer.id); return; }
    if (this.state.budgetPending) throw new Error('Explicit approved budget required first');
    this.selected = offer.id; this.view = 'details'; this.record(id);
    this.afterInspection();
  }
  private afterInspection(): void {
    const progress = progressAfterInspection(this.state, this.stage, this.selected!); this.stage = progress.stage; this.checkpoint = progress.checkpoint;
    if (this.checkpoint) { this.status = 'checkpoint'; return; }
    if (this.state.destinationPending) { this.ask('destination'); return; }
    const selected = offersFor(this.state).find(o => o.id === this.selected)!;
    const conflicts = offerProblems(selected, this.state).filter(p => p.endsWith('_cancellation'));
    if (conflicts.length) this.ask('cancellation');
  }
  private review(id: string): void {
    const offer = offersFor(this.state).find(o => o.id === id)!;
    if (this.stage < 4 || this.selected !== id || offerProblems(offer, this.state).length) throw new Error('Review blocked by cumulative conditions');
    this.view = 'review'; this.status = 'review'; this.record(`review:${id}`);
  }
  private ask(kind: QuestionKind): void {
    if (!Object.hasOwn(QUESTIONS, kind)) throw new Error('Unknown clarification');
    this.question = { id: randomUUID(), kind, text: QUESTIONS[kind] }; this.status = 'question';
    this.state.conversation.push({ role: 'agent', text: `[Manual rehearsal policy gate; no AI] ${QUESTIONS[kind]}` }); this.record(`ask:${kind}`);
  }
  vote(id: string, kind: ScenarioEvent): void {
    const previous = this.state.events.find(e => e.id === id);
    if (previous?.kind === kind) return;
    if (this.status !== 'checkpoint' || this.checkpoint?.id !== id) throw new Error('Stale checkpoint');
    if (!this.checkpoint.choices.some(c => c.id === kind)) throw new Error('Invalid audience choice');
    const number = this.checkpoint.number; applyScenario(this.state, id, kind, this.selected);
    this.stage = number; this.checkpoint = undefined; this.status = 'running';
    if (this.state.budgetPending) this.ask('budget');
  }
  answer(id: string, answer: Record<string, unknown>): void {
    if (this.status !== 'question' || this.question?.id !== id) throw new Error('Stale question');
    answerHuman(this.state, this.question.kind, answer); this.question = undefined; this.status = 'running';
  }
  private record(action: string): void { this.history.push({ action, revision: this.state.revision, result: 'manual local interaction; no model or AWS call' }); }
  page() { return { revision: this.state.revision, iran: this.state.world.iran, offers: offersFor(this.state), selected: this.selected, view: this.view, status: this.status }; }
  snapshot() { return structuredClone({ mode: 'local-manual-no-ai', state: this.state, history: this.history, status: this.status, checkpoint: this.checkpoint, question: this.question, stage: this.stage, decisions: this.decisions }); }
}
