import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Fetch } from '@typesafe-ai/sdk';
type Attempt = { number: number; status: 'pending' | 'complete' | 'uncertain'; model?: string; inputTokens?: number; outputTokens?: number };
type Ledger = { approval: '2026-10-21-additional-USD1'; attempts: Attempt[] };
const MAX_REQUESTS = 40, RESERVATION_USD = .02, INPUT_RATE = .042 / 1000000;
export class JevBudget {
  constructor(private readonly path: string, private readonly transport: Fetch = globalThis.fetch) {}
  readonly fetch: Fetch = async (url, init) => {
    if (url !== 'https://api.typesafe.ai/v1/systemone') throw new Error('Unapproved Jev endpoint');
    if (Buffer.byteLength(String(init?.body ?? ''), 'utf8') > 60000) throw new Error('Jev input size limit exceeded');
    this.validate(init);
    const number = this.reserve();
    try { return await this.send(number, url, init); }
    catch { this.update(number, { status: 'uncertain' }); throw new Error('Jev request outcome uncertain; reconcile ledger before any further call'); }
  };
  private validate(init?: RequestInit): void {
    const body = JSON.parse(String(init?.body ?? '{}'));
    if (body.model !== 'jev-1.13.0') throw new Error('Only the priced Jev model is approved');
    if (new Headers(init?.headers).get('TypeSafe-Danger-Zone-Long-Context') === 'true') throw new Error('Long context is not approved');
  }
  private async send(number: number, url: string, init?: RequestInit): Promise<Response> {
    const response = await this.transport(url, init);
    if (!response.ok) throw new Error('Provider rejected request');
    const data = await response.clone().json(); const input = data.usage?.input_tokens, output = data.usage?.output_tokens;
    if (!Number.isSafeInteger(input) || input < 0 || input > 64000) throw new Error('Invalid provider usage');
    if (!Number.isSafeInteger(output) || output < 0) throw new Error('Invalid provider usage');
    this.update(number, { status: 'complete', model: String(data.model), inputTokens: input, outputTokens: output }); return response;
  }
  private read(): Ledger {
    if (!existsSync(this.path)) return { approval: '2026-10-21-additional-USD1', attempts: [] };
    const data = JSON.parse(readFileSync(this.path, 'utf8')) as Ledger;
    if (data.approval !== '2026-10-21-additional-USD1' || !Array.isArray(data.attempts)) throw new Error('Invalid budget ledger'); return data;
  }
  private change<T>(mutate: (ledger: Ledger) => T): T {
    mkdirSync(dirname(this.path), { recursive: true }); const lock = openSync(`${this.path}.lock`, 'wx');
    try { const ledger = this.read(); const result = mutate(ledger); writeFileSync(`${this.path}.tmp`, JSON.stringify(ledger, null, 2), { mode: 0o600 }); renameSync(`${this.path}.tmp`, this.path); return result; }
    finally { closeSync(lock); unlinkSync(`${this.path}.lock`); }
  }
  private reserve(): number {
    return this.change(ledger => {
      if (ledger.attempts.some(a => a.status !== 'complete')) throw new Error('Previous Jev request requires reconciliation; reconcile before continuing');
      if (ledger.attempts.length >= MAX_REQUESTS) throw new Error('Jev request limit reached below USD1 ceiling');
      const number = ledger.attempts.length + 1; ledger.attempts.push({ number, status: 'pending' }); return number;
    });
  }
  private update(number: number, details: Partial<Attempt>): void { this.change(ledger => { Object.assign(ledger.attempts.find(a => a.number === number)!, details); }); }
  summary() {
    const attempts = this.read().attempts; const inputTokens = attempts.reduce((n, a) => n + (a.inputTokens ?? 0), 0);
    return { approvalUsd: 1, maxRequests: MAX_REQUESTS, requests: attempts.length, remainingRequests: MAX_REQUESTS - attempts.length,
      reservedUsd: attempts.length * RESERVATION_USD, conservativeRemainingUsd: 1 - attempts.length * RESERVATION_USD,
      inputTokens, estimatedUsd: inputTokens * INPUT_RATE, uncertain: attempts.filter(a => a.status !== 'complete').length,
      models: [...new Set(attempts.map(a => a.model).filter(Boolean))] };
  }
}
