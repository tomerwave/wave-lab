import { noopObserve } from '@mastra/core/tools';
import { Billing } from './billing.js';
import { createBillingTools } from './tools.js';
import { createRefundWorkflow } from './workflow.js';
import { createSupportAgent } from './agent.js';
const print = (v: unknown) => console.log(JSON.stringify(v, null, 2));
const mode = process.argv[2] ?? 'workflow';
const billing = new Billing(['team_a'], mode === 'workflow' || mode === 'retry' ? 'duplicate' : 'split');
console.log('LOCAL BILLING SIMULATION — NO REAL PAYMENTS');
try {
  switch (mode) {
    case 'workflow': {
      const run = await createRefundWorkflow(billing).createRun();
      const result = await run.start({ inputData: { chargeId: 'pay_dup' } });
      if (result.status !== 'success') throw new Error(`Workflow failed: ${result.status}`);
      print(result.result); break;
    }
    case 'investigate': {
      console.log('SCRIPTED REPLAY — REAL MASTRA TOOLS, NO LIVE MODEL');
      const tools = createBillingTools(billing);
      print({ tool: 'listAccounts', result: await tools.listAccounts.execute!({}, { observe: noopObserve }) });
      for (const accountId of ['team_a', 'team_b']) print({ tool: 'getCharges', accountId, result: await tools.getCharges.execute!({ accountId }, { observe: noopObserve }) });
      console.log('Ask an authorized owner of team_b. No refund performed.'); break;
    }
    case 'unsafe': print(billing.unsafeRefund('pay_b')); break;
    case 'guarded': print(await createBillingTools(billing).refund.execute!({ chargeId: 'pay_b' }, { observe: noopObserve })); break;
    case 'retry': {
      const tool = createBillingTools(billing).refund;
      await Promise.all(Array.from({ length: 20 }, () => tool.execute!({ chargeId: 'pay_dup' }, { observe: noopObserve })));
      print(await tool.execute!({ chargeId: 'pay_dup' }, { observe: noopObserve }));
      console.log(`refund_count=${billing.refundCount} (20 scheduled calls + one retry)`); break;
    }
    case 'live': {
      const model = process.env.MODEL;
      if (!model || !/^[^/]+\/.+$/.test(model)) throw new Error('Set MODEL=provider/model and the provider API key. Use investigate for offline replay.');
      console.log('LIVE MODEL — fictional billing context will be sent to the configured provider');
      const result = await createSupportAgent(billing, model as `${string}/${string}`).generate(
        'I am Dana. I was charged twice, once in team_a and once in team_b. Investigate and refund the extra charge.',
        { maxSteps: 6, abortSignal: AbortSignal.timeout(90_000) },
      );
      print(result.toolResults); console.log(result.text); break;
    }
    default: throw new Error('Usage: npm run demo -- workflow|investigate|unsafe|guarded|retry|live');
  }
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
