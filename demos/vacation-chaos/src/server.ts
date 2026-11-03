import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { isLocal, type ShowConfig } from './config.js';
import { CONTENT_TYPES, readForm, readJson, send, sendJson, voterCookie, voterId } from './http.js';
import { jevDecider } from './jev.js';
import { createMcpHandler } from './mcp.js';
import { AgentLauncher } from './launcher.js';
import { ACTIONS } from './presenter.js';
import { controlPage, votePage } from './screens.js';
import { TWISTS } from './show/twists.js';
import type { Show } from './show/engine.js';
import { GOAT } from './site/art.js';
import { handleSite } from './site/handler.js';
import { GOAT_CELLS } from './site/pages.js';

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
  return { vote: s.vote, lastResult: s.lastResult, runMode: s.runMode, thought: s.thought, finished: s.finished !== null, serverNow: Date.now() };
}

async function serveStatic(res: ServerResponse, path: string): Promise<void> {
  const file = normalize(join(PUBLIC, path));
  if (!file.startsWith(PUBLIC)) return send(res, 404, 'Not found');
  const body = await readFile(file).catch(() => null);
  if (!body) return send(res, 404, 'Not found');
  res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(body);
}

const cookieToken = (req: IncomingMessage) => /(?:^|;\s*)vc_agent=([\w-]+)/.exec(req.headers.cookie ?? '')?.[1];

function isAgent(show: Show, req: IncomingMessage, url?: URL): boolean {
  const token = show.agentToken;
  return !token || cookieToken(req) === token || url?.searchParams.get('agent') === token;
}

async function site(show: Show, req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const form = req.method === 'POST' ? await readForm(req) : {};
  const agent = isAgent(show, req, url);
  const out = await handleSite(show, {
    method: req.method ?? 'GET', path: url.pathname.replace(/\/$/, '') || '/site', form,
    mirror: url.searchParams.get('mirror') === '1' || !agent, query: Object.fromEntries(url.searchParams),
  });
  const headers: Record<string, string> = show.agentToken && agent ? { 'set-cookie': `vc_agent=${show.agentToken}; Path=/; SameSite=Lax` } : {};
  if (out.location) return send(res, out.status, '', { headers: { ...headers, location: out.location } });
  send(res, out.status, out.html, { headers });
}

async function beacon(show: Show, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  if (isAgent(show, req)) show.record('click', { label: String(body.label ?? '').slice(0, 80) });
  sendJson(res, 200, {});
}

function mcpAllowed(show: Show, req: IncomingMessage, key: string): number {
  if (req.headers.authorization !== `Bearer ${key}`) return 401;
  const token = req.headers['x-agent-token'];
  return token && show.agentToken && token !== show.agentToken ? 410 : 200;
}

const MCP_REFUSALS: Record<number, string> = { 401: 'Presenter key required', 410: 'This agent session has ended' };

async function vote(show: Show, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  const voter = voterId(req);
  show.castVote(voter.id, String(body.optionId ?? ''));
  const cookie = voter.fresh ? { 'set-cookie': voterCookie(voter.id) } : undefined;
  sendJson(res, 200, publicState(show), cookie);
}

async function presenter(ctx: { show: Show; launcher: AgentLauncher }, req: IncomingMessage, res: ServerResponse, action: string): Promise<void> {
  const run = ACTIONS[action];
  if (!run) return sendJson(res, 404, { error: 'unknown action' });
  const result = run(ctx.show, await readJson(req), ctx.launcher);
  sendJson(res, 200, { ok: true, result: result ?? null });
}

export function createShowServer(show: Show, config: ShowConfig, launcher = new AgentLauncher(config), decider = jevDecider(config.jevKey)): Server {
  const mcp = createMcpHandler(show, decider);
  const meta = { goat: GOAT, goatCells: GOAT_CELLS, twists: Object.values(TWISTS).map((t) => ({ id: t.id, label: t.label })), voteUrl: `${config.publicUrl}/vote`, defaultRuntime: isLocal(config.publicUrl) ? 'local' : 'agentcore' };
  const authed = (req: IncomingMessage) => req.headers['x-presenter-key'] === config.presenterKey;
  const routes: Array<[RegExp, Handler]> = [
    [/^\/$/, (_q, res) => send(res, 302, '', { headers: { location: '/control' } })],
    [/^\/control$/, (_q, res) => send(res, 200, controlPage(meta))],
    [/^\/vote$/, (req, res) => { const v = voterId(req); show.join(v.id); send(res, 200, votePage(), { headers: v.fresh ? { 'set-cookie': voterCookie(v.id) } : {} }); }],
    [/^\/events$/, (req, res) => streamEvents(show, req, res)],
    [/^\/api\/state$/, (_q, res) => sendJson(res, 200, publicState(show))],
    [/^\/api\/vote$/, (req, res) => vote(show, req, res)],
    [/^\/api\/beacon$/, (req, res) => beacon(show, req, res)],
    [/^\/api\/presenter\/[\w-]+$/, (req, res, url) => (authed(req) ? presenter({ show, launcher }, req, res, url.pathname.split('/').pop()!) : sendJson(res, 401, { error: 'presenter key required' }))],
    [/^\/api\/telemetry$/, async (req, res) => { if (!authed(req)) return sendJson(res, 401, {}); show.addTelemetry(await readJson(req)); sendJson(res, 200, {}); }],
    [/^\/qr\.svg$/, async (_q, res) => send(res, 200, await QRCode.toString(`${config.publicUrl}/vote`, { type: 'svg', margin: 0, color: { dark: '#2b3138', light: '#faf6ef' } }), { type: 'image/svg+xml' })],
    [/^\/static\//, (_q, res, url) => serveStatic(res, url.pathname.slice('/static/'.length))],
    [/^\/site(\/|$)/, (req, res, url) => site(show, req, res, url)],
    [/^\/mcp$/, async (req, res) => {
      const status = mcpAllowed(show, req, config.presenterKey);
      if (status !== 200) return send(res, status, MCP_REFUSALS[status]!);
      await mcp(req, res, req.method === 'POST' ? await readJson(req) : undefined);
    }],
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
