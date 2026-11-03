import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

export async function readBody(req: IncomingMessage, limit = 64_000): Promise<string> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new Error('Body too large');
  }
  return body;
}

export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(req);
  if (!body) return {};
  const parsed: unknown = JSON.parse(body);
  return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
}

export async function readForm(req: IncomingMessage): Promise<Record<string, string>> {
  return Object.fromEntries(new URLSearchParams(await readBody(req)));
}

export interface SendMeta { type?: string; headers?: Record<string, string> }

export function send(res: ServerResponse, status: number, body: string, meta: SendMeta = {}): void {
  res.writeHead(status, { 'content-type': meta.type ?? 'text/html; charset=utf-8', 'cache-control': 'no-store', ...meta.headers });
  res.end(body);
}

export function sendJson(res: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}): void {
  send(res, status, JSON.stringify(value), { type: 'application/json', headers });
}

export function voterId(req: IncomingMessage): { id: string; fresh: boolean } {
  const match = /(?:^|;\s*)vc_voter=([\w-]+)/.exec(req.headers.cookie ?? '');
  return match ? { id: match[1]!, fresh: false } : { id: randomUUID(), fresh: true };
}

export const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
};
