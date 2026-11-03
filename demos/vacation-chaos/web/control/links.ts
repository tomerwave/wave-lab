import type { RunInfo } from '../../src/show/recap';

export interface Link { label: string; href: string }

const PRICES: Array<[RegExp, number, number]> = [[/haiku/i, 1, 5], [/sonnet/i, 3, 15]];

export function costOf(model: string | null, inputTokens: number, outputTokens: number): number | null {
  const price = PRICES.find(([pattern]) => pattern.test(model ?? ''));
  return price ? (inputTokens * price[1] + outputTokens * price[2]) / 1_000_000 : null;
}

export function agentCoreLinks(run: RunInfo): Link[] {
  const host = `https://${run.region}.console.aws.amazon.com`;
  const region = `region=${run.region}`;
  const group = `/aws/bedrock-agentcore/runtimes/${run.runtimeId}-DEFAULT`.replaceAll('/', '$252F');
  return [
    { label: 'This agent in AgentCore', href: `${host}/bedrock-agentcore/agents/${run.harnessId}?${region}` },
    { label: 'Traces and sessions', href: `${host}/bedrock-agentcore/observability?${region}&runtime=${run.runtimeId}` },
    { label: 'Logs for this run', href: `${host}/cloudwatch/home?${region}#logsV2:log-groups/log-group/${group}/log-events$3FfilterPattern$3D$2522${run.sessionId}$2522` },
    { label: 'Memory', href: `${host}/bedrock-agentcore/memory?${region}` },
    { label: 'Browser', href: `${host}/bedrock-agentcore/browser?${region}` },
  ];
}
