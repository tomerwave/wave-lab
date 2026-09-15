import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { Billing } from './billing.js';
const inputSchema = z.object({ chargeId: z.string() });
const outputSchema = z.object({ status: z.string(), receiptId: z.string().optional(), amount: z.number().optional() });
export function createRefundWorkflow(billing: Billing) {
  const refund = createStep({
    id: 'check-and-refund', inputSchema, outputSchema,
    execute: async ({ inputData }) => billing.refund(inputData.chargeId),
  });
  return createWorkflow({ id: 'refund-workflow', inputSchema, outputSchema }).then(refund).commit();
}
