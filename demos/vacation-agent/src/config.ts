export type RunConfig = { executablePath?: string; headed: boolean; slowMoMs: number };
export type JevConfig = { apiKey: string };
export type AwsConfig = { region: string; plannerModelId: string };

const DEFAULT_PLANNER_MODEL = 'global.anthropic.claude-sonnet-4-6';

export function loadRunConfig(): RunConfig {
  const slowMo = Number(process.env.SLOW_MO_MS ?? '0');
  return {
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headed: process.env.HEADED === '1',
    slowMoMs: Number.isFinite(slowMo) && slowMo >= 0 ? slowMo : 0,
  };
}

export function loadJevConfig(): JevConfig {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new Error('Set TYPESAFE_API_KEY to use --chooser jev. Use the default scripted chooser for an offline run.');
  return { apiKey };
}

export function loadAwsConfig(): AwsConfig {
  const region = process.env.AWS_REGION;
  if (!region) throw new Error('Set AWS_REGION and AWS credentials to use --browser agentcore or --planner strands.');
  return { region, plannerModelId: process.env.BEDROCK_MODEL_ID || DEFAULT_PLANNER_MODEL };
}

export function loadStageConfig(): { port: number; liveEnabled: boolean } {
  const port = Number(process.env.STAGE_PORT ?? '4317');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('STAGE_PORT must be an integer from 1024 to 65535');
  return { port, liveEnabled: process.env.ALLOW_PAID_STAGE === '1' };
}

export function loadLocalJevConfig(): { enabled: boolean; ledgerPath: string } {
  return { enabled: process.env.ALLOW_PAID_JEV_LOCAL === '1', ledgerPath: new URL('../../../.cache/jev-validation-2026-10-21.json', import.meta.url).pathname };
}
