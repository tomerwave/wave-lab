import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Billing } from './billing.js';

export function createBillingTools(billing: Billing) {
  return {
    listAccounts: createTool({
      id: 'list-accounts', description: 'List the accounts the authenticated user may access.',
      inputSchema: z.object({}).strict(),
      execute: async () => billing.listAccounts(),
    }),
    getCharges: createTool({
      id: 'get-charges', description: 'Read charges in an authorized account. Forbidden means ask an authorized account owner.',
      inputSchema: z.object({ accountId: z.string().min(1) }).strict(),
      execute: async ({ accountId }) => billing.getCharges(accountId),
    }),
    refund: createTool({
      id: 'refund', description: 'Request a simulated refund. The server checks access, verified duplication and the amount limit. Never claim success unless the result confirms it.',
      inputSchema: z.object({ chargeId: z.string().min(1) }).strict(),
      execute: async ({ chargeId }) => billing.refund(chargeId),
    }),
  };
}
