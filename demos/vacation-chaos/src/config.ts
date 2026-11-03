import { randomBytes } from 'node:crypto';

export interface ShowConfig {
  port: number;
  publicUrl: string;
  presenterKey: string;
}

export function loadConfig(): ShowConfig {
  const port = Number(process.env.PORT ?? 4545);
  if (!Number.isInteger(port) || port <= 0) throw new Error('PORT must be a positive integer.');
  return {
    port,
    publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
    presenterKey: process.env.PRESENTER_KEY ?? randomBytes(4).toString('hex'),
  };
}
