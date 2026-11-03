import { choice, TypeSafeClient } from '@typesafe-ai/sdk';

export interface DecisionRequest { question: string; options: Record<string, string>; context: string }
export interface Decision { choice: string; confidence: number; probabilities: Record<string, number> }
export type Decider = (request: DecisionRequest) => Promise<Decision>;

export function jevDecider(apiKey: string | undefined): Decider | undefined {
  if (!apiKey) return undefined;
  const client = new TypeSafeClient({ apiKey });
  return async ({ question, options, context }) => {
    const { answers } = await client.systemOne({ state: { context }, questions: { decision: choice(question, options) } });
    const { choice: picked, confidence, probabilities } = answers.decision;
    return { choice: picked, confidence, probabilities: { ...probabilities } };
  };
}
