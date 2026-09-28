import { Agent, BedrockModel, tool } from '@strands-agents/sdk';
import { z } from 'zod';
import type { Goal } from './hotels.js';
import type { Outcome } from './loop.js';

export const FIND_HOTEL_TOOL = 'find_hotel';

export type PlannerOptions = {
  region: string;
  modelId: string;
  goal: Goal;
  findHotel: () => Promise<Outcome>;
};

function instructions(goal: Goal): string {
  return [
    `Plan a ${goal.nights}-night stay: ${goal.subgoal}, at most ${goal.budgetEur} EUR for the whole stay.`,
    `Call ${FIND_HOTEL_TOOL} once. It browses a fictional site and stops before payment.`,
    'Report the outcome in two sentences.',
    'If no hotel fits, say so and ask the traveler which condition to change. Never change the budget or drop accessibility yourself.',
  ].join(' ');
}

export function onlyOnce(search: () => Promise<Outcome>): () => Promise<string> {
  let used = false;
  return async () => {
    if (used) return JSON.stringify({ error: 'find_hotel already ran for this trip. Report its outcome.' });
    used = true;
    return JSON.stringify(await search());
  };
}

export function createPlanner(options: PlannerOptions): Agent {
  const findHotelTool = tool({
    name: FIND_HOTEL_TOOL,
    description: 'Search the demo hotel site with the fixed conditions. The code checks budget and accessibility and never pays.',
    inputSchema: z.object({}).strict(),
    callback: onlyOnce(options.findHotel),
  });
  return new Agent({
    model: new BedrockModel({ region: options.region, modelId: options.modelId }),
    systemPrompt: instructions(options.goal),
    tools: [findHotelTool],
    printer: false,
  });
}
