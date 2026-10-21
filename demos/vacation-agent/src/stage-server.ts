import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { LocalJevController } from './stage-local-jev.js';
import { LocalStageController } from './stage-local.js';
import { renderStageSite } from './stage-site.js';
import { StageController } from './stage-controller.js';
import type { ScenarioEvent } from './stage-state.js';
export type StageServerOptions = { liveEnabled: boolean; createRun: () => StageController; autonomousEnabled?: boolean; createAutonomousRun?: () => LocalJevController; budgetSummary?: () => unknown };
const webRoot = new URL('../web/', import.meta.url);
const dcvRoot = fileURLToPath(new URL('./nice-dcv-web-client-sdk/dcvjs-esm/', import.meta.resolve('bedrock-agentcore/browser/live-view')));
type Run = StageController | LocalStageController;
type Snapshot = ReturnType<Run['snapshot']>;
type RequestData = Record<string, unknown>;
function json(res: ServerResponse, status: number, value: unknown): void { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
async function body(req: IncomingMessage): Promise<RequestData> {
  let text = ''; for await (const chunk of req) { text += String(chunk); if (text.length > 8192) throw new Error('Request too large'); }
  const data: unknown = JSON.parse(text || '{}');
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected an object'); return data as RequestData;
}
function isSameOrigin(req: IncomingMessage): boolean { return req.method !== 'POST' || req.headers.origin === `http://${req.headers.host}`; }
async function dcvAsset(pathname: string, res: ServerResponse): Promise<void> {
  const target = resolve(dcvRoot, decodeURIComponent(pathname.slice(5)));
  if (!target.startsWith(resolve(dcvRoot) + sep) || !/\.(js|wasm)$/.test(target)) { json(res, 404, { error: 'Not found' }); return; }
  try { const file = await readFile(target); res.setHeader('Content-Type', target.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'); res.end(file); }
  catch { json(res, 404, { error: 'Not found' }); }
}
async function webAsset(pathname: string, res: ServerResponse): Promise<void> {
  if (pathname === '/local-site') { res.setHeader('Content-Security-Policy', "frame-ancestors 'self'"); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(renderStageSite().replace('</body>', '<script src="/local-site.js"></script></body>')); return; }
  res.setHeader('Content-Type', pathname === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
  res.end(await readFile(new URL(pathname === '/' ? 'dashboard.html' : pathname.slice(1), webRoot)));
}
class StageHttp {
  current?: Run; previous?: Snapshot; viewerReady = false; changingRun = false;
  readonly server = createServer((req, res) => { void this.handle(req, res).catch(() => { if (!res.headersSent) json(res, 400, { error: 'Invalid request or unavailable operation. Inspect the run state.' }); else res.end(); }); });
  constructor(private readonly options: StageServerOptions) { this.server.requestTimeout = 40000; this.server.headersTimeout = 10000; }
  private authorized(req: IncomingMessage): boolean {
    const address = this.server.address(); const port = address && typeof address === 'object' ? address.port : undefined;
    return [`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host ?? '') && isSameOrigin(req);
  }
  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    if (!this.authorized(req)) { json(res, 403, { error: 'Loopback Host and same-origin control required' }); return; }
    const pathname = new URL(req.url ?? '/', `http://${req.headers.host}`).pathname;
    if (req.method === 'GET') return this.get(pathname, res);
    if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }
    await this.post(pathname, await body(req), res);
  }
  private async get(pathname: string, res: ServerResponse): Promise<void> {
    const api: Record<string, () => unknown> = {
      '/api/state': () => ({ liveEnabled: this.options.liveEnabled, mode: this.mode(), autonomousEnabled: this.options.autonomousEnabled ?? false, budget: this.options.budgetSummary?.(), run: this.current?.snapshot(), viewerReady: this.viewerReady, streamAvailable: this.streamAvailable() }),
      '/api/local-page': () => this.current instanceof LocalStageController ? { ...this.current.page(), runId: this.current.state.id } : null,
      '/api/replay': () => ({ kind: 'recorded-transcript-not-live-ai', run: this.previous ?? this.current?.snapshot() ?? null }),
    };
    if (api[pathname]) { json(res, 200, api[pathname]()); return; }
    if (await this.viewRoute(pathname, res)) return;
    if (['/', '/dashboard.js', '/live-view.js', '/local-site', '/local-site.js'].includes(pathname)) return webAsset(pathname, res);
    if (pathname.startsWith('/dcv/')) return dcvAsset(pathname, res);
    json(res, 404, { error: 'Not found' });
  }
  private async viewRoute(pathname: string, res: ServerResponse): Promise<boolean> {
    if (pathname === '/api/local-frame') { await this.localFrame(res); return true; }
    if (pathname === '/api/live-view') { this.liveView(res); return true; }
    return false;
  }
  private mode(): string {
    if (this.current instanceof LocalStageController) return 'local';
    return this.current instanceof LocalJevController ? 'local-autonomous' : 'live';
  }
  private async localFrame(res: ServerResponse): Promise<void> {
    if (!(this.current instanceof LocalJevController) || !this.activeView()) { json(res, 409, { error: 'No local agent browser' }); return; }
    const frame = await this.current.frame(); res.setHeader('Content-Type', 'image/jpeg'); res.end(frame);
  }
  private activeView(): boolean { return !!this.current && ['paused', 'running', 'checkpoint', 'question', 'review'].includes(this.current.status); }
  private streamAvailable(): boolean { return !!this.current?.liveViewUrl && ['paused', 'running', 'checkpoint', 'question', 'review'].includes(this.current.status); }
  private liveView(res: ServerResponse): void {
    if (!this.streamAvailable()) { json(res, 409, { error: 'No live stream' }); return; }
    json(res, 200, { signedUrl: this.current!.liveViewUrl });
  }
  private async post(pathname: string, data: RequestData, res: ServerResponse): Promise<void> {
    const starts: Record<string, () => Promise<void>> = { '/api/start': () => this.start(res), '/api/start-local': () => this.startLocal(res), '/api/start-autonomous': () => this.startAutonomous(res) };
    if (starts[pathname]) return starts[pathname]();
    if (!this.current || data.runId !== this.current.state.id) { json(res, 409, { error: 'Missing or stale run ID' }); return; }
    if (pathname === '/api/stop') { await this.current.stop(); json(res, 200, { ok: true }); return; }
    if (pathname === '/api/reset') return this.reset(res);
    this.control(pathname, data); void this.current.pump(); json(res, 200, { ok: true });
  }
  private async start(res: ServerResponse): Promise<void> {
    if (!this.options.liveEnabled) { json(res, 409, { error: 'Paid services disabled. A separate approved live rehearsal and ALLOW_PAID_STAGE=1 are required.' }); return; }
    if (this.current || this.changingRun) { json(res, 409, { error: 'Reset before starting another run' }); return; }
    this.changingRun = true;
    try { this.current = this.options.createRun(); await this.current.start(); this.current.pause(); await this.current.pump(); json(res, 200, { runId: this.current.state.id }); }
    finally { this.changingRun = false; }
  }
  private async startAutonomous(res: ServerResponse): Promise<void> {
    if (!this.options.autonomousEnabled || !this.options.createAutonomousRun) { json(res, 409, { error: 'Local paid Jev validation disabled' }); return; }
    if (this.current || this.changingRun) { json(res, 409, { error: 'Reset before starting another run' }); return; }
    this.changingRun = true;
    try { this.current = this.options.createAutonomousRun(); await this.current.start(); this.current.pause(); await this.current.pump(); json(res, 200, { runId: this.current.state.id }); }
    finally { this.changingRun = false; }
  }
  private async startLocal(res: ServerResponse): Promise<void> {
    if (this.current || this.changingRun) { json(res, 409, { error: 'Reset before starting another run' }); return; }
    this.changingRun = true;
    try { this.current = new LocalStageController(); await this.current.start(); this.viewerReady = true; json(res, 200, { runId: this.current.state.id }); }
    finally { this.changingRun = false; }
  }
  private async reset(res: ServerResponse): Promise<void> {
    if (this.changingRun) { json(res, 409, { error: 'Wait for start/reset to settle; emergency stop remains available' }); return; }
    this.changingRun = true;
    try { this.previous = this.current!.snapshot(); await this.current!.stop(); this.current = undefined; this.viewerReady = false; json(res, 200, { ok: true }); }
    finally { this.changingRun = false; }
  }
  private control(pathname: string, data: RequestData): void {
    if (this.changingRun) throw new Error('Run is starting/resetting');
    const run = this.current!;
    const actions: Record<string, () => void> = {
      '/api/ready': () => { if (!this.viewerReady) { run.resume(); this.viewerReady = true; } },
      '/api/pause': () => run.pause(),
      '/api/resume': () => { if (!this.viewerReady) throw new Error('Wait for stream'); run.resume(); },
      '/api/vote': () => run.vote(String(data.id), String(data.choice) as ScenarioEvent),
      '/api/local-action': () => this.localAction(data),
      '/api/answer': () => this.answer(data),
    };
    if (!actions[pathname]) throw new Error('Unknown control'); actions[pathname]();
  }
  private localAction(data: RequestData): void {
    if (!(this.current instanceof LocalStageController)) throw new Error('Local manual session required');
    this.current.action(String(data.action), Number(data.revision));
  }
  private answer(data: RequestData): void {
    if (!data.answer || typeof data.answer !== 'object' || Array.isArray(data.answer)) throw new Error('Expected an answer object');
    this.current!.answer(String(data.id), data.answer as RequestData);
  }
  async close(): Promise<void> {
    await this.current?.stop(); this.server.closeAllConnections();
    await new Promise<void>((done, reject) => this.server.close(error => error ? reject(error) : done()));
  }
}
export function createStageServer(options: StageServerOptions) { return new StageHttp(options); }
