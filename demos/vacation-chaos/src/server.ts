import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import type { ShowConfig } from './config.js';
import { CONTENT_TYPES, readForm, readJson, send, sendJson, voterId } from './http.js';
import { createMcpHandler } from './mcp.js';
import { AgentLauncher } from './launcher.js';
import { ACTIONS } from './presenter.js';
import { controlPage, votePage } from './screens.js';
import { CHECKPOINTS } from './show/engine.js';
import { TWISTS } from './show/twists.js';
import type { Show } from './show/engine.js';
import { handleSite } from './site/handler.js';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
type Handler = (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void> | void;

function streamEvents(show: Show, req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  const push = () => res.write(`data: ${JSON.stringify({ ...show.snapshot(), serverNow: Date.now() })}\n\n`);
  push();
  const off = show.onChange(push);
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => { off(); clearInterval(ping); });
}

function publicState(show: Show) {
  const s = show.snapshot();
  return { vote: s.vote, lastResult: s.lastResult, checkpoint: s.checkpoint, runMode: s.runMode };
}

async function serveStatic(res: ServerResponse, path: string): Promise<void> {
  const file = normalize(join(PUBLIC, path));
  if (!file.startsWith(PUBLIC)) return send(res, 404, 'Not found');
  const body = await readFile(file).catch(() => null);
  if (!body) return send(res, 404, 'Not found');
  res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'max-age=60' });
  res.end(body);
}

async function site(show: Show, req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const form = req.method === 'POST' ? await readForm(req) : {};
  const out = await handleSite(show, {
    method: req.method ?? 'GET', path: url.pathname.replace(/\/$/, '') || '/site', form,
    mirror: url.searchParams.get('mirror') === '1', query: Object.fromEntries(url.searchParams),
  });
  if (out.location) return send(res, out.status, '', { headers: { location: out.location } });
  send(res, out.status, out.html);
}

async function vote(show: Show, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  const voter = voterId(req);
  show.castVote(voter.id, String(body.optionId ?? ''));
  const cookie = voter.fresh ? { 'set-cookie': `vc_voter=${voter.id}; Path=/; Max-Age=86400; SameSite=Lax` } : undefined;
  sendJson(res, 200, publicState(show), cookie);
}

async function presenter(ctx: { show: Show; launcher: AgentLauncher }, req: IncomingMessage, res: ServerResponse, action: string): Promise<void> {
  const run = ACTIONS[action];
  if (!run) return sendJson(res, 404, { error: 'unknown action' });
  const result = run(ctx.show, await readJson(req), ctx.launcher);
  sendJson(res, 200, { ok: true, result: result ?? null });
}

export function createShowServer(show: Show, config: ShowConfig, launcher = new AgentLauncher(config)): Server {
  const mcp = createMcpHandler(show);
  const meta = { checkpoints: CHECKPOINTS, twists: Object.values(TWISTS).map((t) => ({ id: t.id, label: t.label })), voteUrl: `${config.publicUrl}/vote` };
  const authed = (req: IncomingMessage) => req.headers['x-presenter-key'] === config.presenterKey;
  const routes: Array<[RegExp, Handler]> = [
    [/^\/$/, (_q, res) => send(res, 302, '', { headers: { location: '/control' } })],
    [/^\/control$/, (_q, res) => send(res, 200, controlPage(meta))],
    [/^\/vote$/, (_q, res) => send(res, 200, votePage())],
    [/^\/events$/, (req, res) => streamEvents(show, req, res)],
    [/^\/api\/state$/, (_q, res) => sendJson(res, 200, publicState(show))],
    [/^\/api\/vote$/, (req, res) => vote(show, req, res)],
    [/^\/api\/beacon$/, async (req, res) => { const b = await readJson(req); show.record('click', { label: String(b.label ?? '').slice(0, 80) }); sendJson(res, 200, {}); }],
    [/^\/api\/presenter\/[\w-]+$/, (req, res, url) => (authed(req) ? presenter({ show, launcher }, req, res, url.pathname.split('/').pop()!) : sendJson(res, 401, { error: 'presenter key required' }))],
    [/^\/api\/telemetry$/, async (req, res) => { if (!authed(req)) return sendJson(res, 401, {}); show.addTelemetry(await readJson(req)); sendJson(res, 200, {}); }],
    [/^\/qr\.svg$/, async (_q, res) => send(res, 200, await QRCode.toString(`${config.publicUrl}/vote`, { type: 'svg', margin: 0, color: { dark: '#2b3138', light: '#faf6ef' } }), { type: 'image/svg+xml' })],
    [/^\/static\//, (_q, res, url) => serveStatic(res, url.pathname.slice('/static/'.length))],
    [/^\/site(\/|$)/, (req, res, url) => site(show, req, res, url)],
    [/^\/mcp\/[\w-]+$/, async (req, res, url) => (url.pathname.endsWith(`/${config.presenterKey}`) ? mcp(req, res, req.method === 'POST' ? await readJson(req) : undefined) : send(res, 404, 'Not found'))],
  ];
  const ticker = setInterval(() => show.tick(), 250);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const handler = routes.find(([pattern]) => pattern.test(url.pathname))?.[1];
    if (!handler) return send(res, 404, 'Not found');
    Promise.resolve(handler(req, res, url)).catch((error: unknown) => {
      if (!res.headersSent) sendJson(res, 500, { error: error instanceof Error ? error.message : 'error' });
    });
  });
  server.on('close', () => clearInterval(ticker));
  return server;
}
