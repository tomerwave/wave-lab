import type { CompactState, Json } from './compact.js';
import type { Choice } from './chooser.js';
import type { Outcome, StepEvent } from './loop.js';

function inline(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${inline(item)}`).join(', ')} }`;
  }
  return String(value);
}

export function formatState(state: CompactState): string[] {
  return Object.entries(state).map(([key, value]) => `  ${key}: ${inline(value)}`);
}

function formatChoice(choice: Choice): string {
  const confidence = choice.confidence === undefined ? '' : `, confidence ${choice.confidence.toFixed(2)}`;
  return `choice: ${choice.id} (${choice.source}${confidence})`;
}

export function formatStep(event: StepEvent): string[] {
  const metadata = event.runId ? [`run: ${event.runId}, mode: ${event.mode}, world revision: ${event.revision}, decision revision: ${event.decisionRevision}`] : [];
  const choice = event.interrupted ? 'choice: none (decision interrupted)' : formatChoice(event.choice);
  return [...metadata, `step ${event.step}`, 'state:', ...formatState(event.state), choice, `code: ${event.result}`, ''];
}

export function formatOutcome(outcome: Outcome): string {
  if (outcome.status === 'found' && outcome.hotel) {
    return `outcome: found hotel ${outcome.hotel.id} (${outcome.hotel.totalEur} EUR, accessible). Stopped before payment.`;
  }
  if (outcome.status === 'timeout') return 'outcome: chooser timed out. No choice was executed. Stopped.';
  if (outcome.status === 'no_match') return 'outcome: no hotel meets every condition. Stopped to ask the traveler.';
  if (outcome.status === 'stopped') return 'outcome: the agent stopped before finding a hotel. Stopped to ask the traveler.';
  return `outcome: step limit reached after ${outcome.steps} steps. Stopped.`;
}
