import { randomBytes } from 'node:crypto';

export interface ShowConfig {
  port: number;
  publicUrl: string;
  presenterKey: string;
  jevKey?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ShowConfig {
  const port = Number(env.PORT ?? 4545);
  if (!Number.isInteger(port) || port <= 0) throw new Error('PORT must be a positive integer.');
  const publicUrl = (env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, '');
  const presenterKey = env.PRESENTER_KEY ?? randomBytes(12).toString('hex');
  checkKey(presenterKey, publicUrl);
  return { port, publicUrl, presenterKey, jevKey: env.TYPESAFE_API_KEY || undefined };
}

export function checkKey(key: string, publicUrl: string): void {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(publicUrl);
  if (!local && key.length < 16) throw new Error('PRESENTER_KEY must be at least 16 characters when PUBLIC_URL is public.');
}

const SERVER_ONLY = ['TYPESAFE_API_KEY'];

export function agentEnvironment(config: ShowConfig, showUrl: string, env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const inherited = Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined && !SERVER_ONLY.includes(entry[0])));
  return { ...inherited, SHOW_URL: showUrl, PRESENTER_KEY: config.presenterKey };
}
