export type Charge = { id: string; accountId: string; amount: number; duplicate: boolean };
export type Result = { status: string; receiptId?: string; amount?: number };

// Server-owned session and fictional data. Never accept permissions from the model.
export class Billing {
  private readonly accounts: Set<string>;
  private readonly charges: Map<string, Charge>;
  private readonly ledger = new Map<string, Result>();
  constructor(accounts = ['team_a'], scenario: 'duplicate' | 'split' = 'split') {
    this.accounts = new Set(accounts);
    this.charges = new Map([
      { id: 'pay_a', accountId: 'team_a', amount: 9900, duplicate: false },
      { id: 'pay_b', accountId: 'team_b', amount: 9900, duplicate: false },
      ...(scenario === 'duplicate' ? [
        { id: 'pay_dup', accountId: 'team_a', amount: 9900, duplicate: true },
        { id: 'pay_large', accountId: 'team_a', amount: 90000, duplicate: true },
      ] : []),
    ].map(c => [c.id, c]));
  }
  listAccounts() { return [...this.accounts]; }
  getCharges(accountId: string) {
    if (!this.accounts.has(accountId)) return { status: 'forbidden' };
    return [...this.charges.values()].filter(c => c.accountId === accountId).map(c => ({ ...c }));
  }
  // Intentionally broken. Local CLI only; NEVER registered as an agent tool.
  unsafeRefund(chargeId: string): Result {
    const charge = this.charges.get(chargeId);
    if (!charge) return { status: 'not_found' };
    const receipt = { status: 'refunded_in_simulation', receiptId: `unsafe_${this.ledger.size + 1}`, amount: charge.amount };
    this.ledger.set(receipt.receiptId, receipt);
    return { ...receipt };
  }
  refund(chargeId: string): Result {
    const charge = this.charges.get(chargeId);
    if (!charge) return { status: 'not_found' };
    if (!this.accounts.has(charge.accountId)) return { status: 'forbidden' };
    const saved = this.ledger.get(chargeId);
    if (saved) return { ...saved };
    if (!charge.duplicate || charge.amount > 20000) return { status: 'needs_review' };
    // No await between checking and recording: atomic within this Node process.
    const receipt = { status: 'refunded_in_simulation', receiptId: `refund_${chargeId}`, amount: charge.amount };
    this.ledger.set(chargeId, receipt);
    return { ...receipt };
  }
  get refundCount() { return this.ledger.size; }
}
