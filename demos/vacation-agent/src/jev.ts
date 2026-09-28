import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import type { Chooser, ChoiceRequest } from './chooser.js';

export const QUESTION = 'Which available action advances the subgoal without breaking the budget or the accessibility requirement?';

function criteria({ options }: ChoiceRequest): Record<string, string> {
  return Object.fromEntries(options.map(option => [option.id, option.description]));
}

export function createJevChooser(client: TypeSafeClient): Chooser {
  return {
    async choose(request) {
      const result = await client.systemOne({
        state: request.state,
        questions: { nextAction: choice(QUESTION, criteria(request)) },
      });
      const answer = result.answers.nextAction;
      return { id: answer.choice, confidence: answer.confidence, source: 'jev' };
    },
  };
}
