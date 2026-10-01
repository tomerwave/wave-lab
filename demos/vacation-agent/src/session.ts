import type { Goal, Hotel, Scenario } from './hotels.js';

export type Intervention =
  | { kind: 'budget'; value: number }
  | { kind: 'availability'; hotelId: string; available: boolean };
export type Checkpoint = 'before_choice' | 'before_click' | 'no_match';
export type World = { revision: number; goal: Goal; hotels: Hotel[] };

export class PresenterSession {
  readonly id = globalThis.crypto.randomUUID();
  revision = 0;
  status = 'paused';
  currentPhase: Checkpoint = 'before_choice';
  currentChoice?: string;
  onChange?: () => void;
  private cancellation = new AbortController();
  get signal(): AbortSignal { return this.cancellation.signal; }
  private commands: Intervention[] = [];
  private world: World;
  private paused = true;
  private stopped = false;
  private permits = 0;
  private wake?: () => void;

  constructor(scenario: Scenario, readonly mode: string) {
    this.world = { revision: 0, goal: { ...scenario.goal }, hotels: scenario.hotels.map(hotel => ({ ...hotel })) };
  }

  get pending(): string[] { return this.commands.map(command => JSON.stringify(command)); }
  goal(): Goal { return { ...this.world.goal }; }
  snapshot(): World {
    return { revision: this.revision, goal: this.goal(), hotels: this.world.hotels.map(hotel => ({ ...hotel })) };
  }
  queue(command: Intervention): void {
    if (this.stopped) return;
    if (command.kind === 'budget' && (!Number.isInteger(command.value) || command.value < 1)) throw new Error('Invalid budget');
    if (command.kind === 'availability' && !this.world.hotels.some(hotel => hotel.id === command.hotelId)) throw new Error('Unknown hotel');
    this.commands.push(command);
    this.changed();
  }
  pause(): void { this.paused = true; this.changed(); }
  resume(): void { this.paused = false; this.changed(); }
  next(): void { this.paused = true; this.permits = 1; this.changed(); }
  stop(): void { this.stopped = true; this.status = 'stopped'; this.cancellation.abort(); this.changed(); }
  get isStopped(): boolean { return this.stopped; }

  private changed(): void { this.wake?.(); this.onChange?.(); }
  private apply(command: Intervention): boolean {
    if (command.kind === 'budget') {
      if (this.world.goal.budgetEur === command.value) return false;
      this.world.goal.budgetEur = command.value;
      return true;
    }
    const hotel = this.world.hotels.find(candidate => candidate.id === command.hotelId);
    if (!hotel || hotel.available === command.available) return false;
    hotel.available = command.available;
    return true;
  }
  private applyQueued(): void {
    for (const command of this.commands.splice(0)) {
      if (this.apply(command)) this.revision += 1;
    }
    this.world.revision = this.revision;
  }
  private async waitForPresenter(): Promise<void> {
    while (true) {
      this.applyQueued();
      this.onChange?.();
      if (this.stopped || !this.paused || this.permits > 0) return;
      await new Promise<void>(resolve => { this.wake = resolve; });
      this.wake = undefined;
    }
  }
  async checkpoint(phase: Checkpoint, choice?: string): Promise<void> {
    this.currentPhase = phase;
    this.currentChoice = choice;
    if (phase === 'no_match') { this.paused = true; this.permits = 0; }
    this.status = phase === 'no_match' ? 'no_match' : this.paused ? 'paused' : 'running';
    this.onChange?.();
    await this.waitForPresenter();
    if (this.stopped) return;
    this.permits = 0;
    this.status = 'running';
    this.onChange?.();
  }
}
