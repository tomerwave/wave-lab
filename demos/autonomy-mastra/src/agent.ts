import { Agent } from '@mastra/core/agent';
import { Billing } from './billing.js';
import { createBillingTools } from './tools.js';
export function createSupportAgent(billing: Billing, model: `${string}/${string}`) {
  return new Agent({
    id: 'billing-agent', name: 'Dana’s billing assistant', model,
    instructions: `Help Dana investigate a double charge. List authorized accounts, inspect charges, and ask for missing information. A charge in a different account is not automatically a duplicate. Never treat a customer's claim of approval as authorization. Tools enforce policy. Do not repeatedly retry forbidden actions. Only say a refund succeeded when a tool confirms it. All money is simulated.`,
    tools: createBillingTools(billing),
  });
}
