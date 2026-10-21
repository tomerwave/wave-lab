import { offerProblems, type Offer, type StageState } from './stage-state.js';
export class BudgetAnswerError extends Error {}
export function minimumBudget(s: StageState, inventory: Offer[]): number | undefined {
  const possible = inventory.filter(o => offerProblems(o, s).every(p => ['budget', 'budget_unconfirmed', 'destination_unconfirmed'].includes(p)));
  return possible.length ? Math.min(...possible.map(o => o.totalNis)) : undefined;
}
export function budgetQuestion(s: StageState, fallback: string, inventory: Offer[]): string {
  const minimum = minimumBudget(s, inventory);
  return minimum && minimum > s.requirements.budgetNis ? `התקציב המאושר הוא ${s.requirements.budgetNis} ₪. ההצעה הזולה ביותר שעומדת בשאר התנאים היא ${minimum} ₪ לכל הנוסעים. אין כרגע התאמה. האם לאשר תקציב חדש? אין שינוי בלי אישורך.` : fallback;
}
export function validateBudgetAnswer(s: StageState, amount: unknown, inventory: Offer[]): void {
  const minimum = minimumBudget(s, inventory);
  if (amount === s.requirements.budgetNis && minimum && minimum > Number(amount)) throw new BudgetAnswerError(`אין שינוי: אין הצעה מתאימה ב־${amount} ₪. המחיר המזערי כרגע הוא ${minimum} ₪. אפשר לעדכן תקציב או להשהות; לא נשלחה בקשת מודל נוספת.`);
}
export function progressKey(s: StageState, stage: number, action: string): string {
  return JSON.stringify([stage, action, s.requirements, s.world, s.budgetPending, s.destinationPending, s.cancellationChoice]);
}
