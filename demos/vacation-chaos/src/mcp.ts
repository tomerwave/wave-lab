import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Decider, DecisionRequest } from './jev.js';
import type { Show, ToolReply } from './show/engine.js';
import type { Ask } from './show/types.js';

const asText = (value: ToolReply | Record<string, unknown>) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });

export const ASK_HEARTBEAT_MS = 60_000;

async function askWithHeartbeat(show: Show, { question, kind, options }: Ask): Promise<Record<string, unknown>> {
  let timer: NodeJS.Timeout | undefined;
  const waiting = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ASK_HEARTBEAT_MS); });
  const answer = await Promise.race([show.ask(question, kind, options), waiting]).finally(() => clearTimeout(timer));
  return answer === null ? { answer: null, note: 'The presenter has not answered yet. Call ask_presenter again with the same question.' } : { answer };
}

async function decide(show: Show, decider: Decider, request: DecisionRequest): Promise<Record<string, unknown>> {
  try {
    const decision = await decider(request);
    const percent = Math.round(decision.confidence * 100);
    show.record('step', { kind: 'Jev', text: `${request.options[decision.choice] ?? decision.choice} (${percent}%)` });
    return { ...decision };
  } catch (error) {
    show.record('step', { kind: 'Jev', text: 'Unavailable, the agent decides alone' });
    return { error: error instanceof Error ? error.message : 'Jev failed', note: 'Jev is unavailable. Decide yourself.' };
  }
}

function registerDecide(server: McpServer, show: Show, decider: Decider): void {
  server.registerTool('jev_decide', {
    description: 'Ask Jev, a fast decision model, to pick one option. Use it for every real choice: which flight, which hotel, whether fine print is a trap, whether to pay. Give option ids with a short description each, and the facts Jev needs in context.',
    inputSchema: {
      question: z.string().min(1).max(300),
      options: z.record(z.string().regex(/^[a-z0-9-]{1,40}$/), z.string().min(1).max(200)).refine((o) => Object.keys(o).length >= 2 && Object.keys(o).length <= 8, 'Give 2 to 8 options.'),
      context: z.string().min(1).max(4000),
    },
  }, async (request) => asText(await decide(show, decider, request)));
}

export function buildMcpServer(show: Show, decider?: Decider): McpServer {
  const server = new McpServer({ name: 'vacation-chaos-show', version: '1.0.0' });
  server.registerTool('think_aloud', {
    description: 'Say what you are about to do and why, in one or two short sentences the audience will read. Call this once per page, after the page loads. Returns the current mission, any new messages and page: the text of the page you are on with its Page actions.',
    inputSchema: { thought: z.string().min(1).max(400) },
  }, async ({ thought }) => asText(await show.think(thought)));
  server.registerTool('check_inbox', {
    description: 'Get the current mission and any new messages from Tomer, the boss or the world. Call this first, and whenever you finish a step.',
    inputSchema: {},
  }, async () => asText(await show.checkInbox()));
  server.registerTool('ask_presenter', {
    description: 'Ask the human presenter and wait for the answer. Mission Control shows your question full screen with controls that match kind: "approval" shows Approve and Decline (use it before paying over budget), "human-check" shows the CAPTCHA for the human to solve, "question" shows your options as buttons.',
    inputSchema: {
      question: z.string().min(1).max(300),
      kind: z.enum(['approval', 'human-check', 'question']).default('question'),
      options: z.array(z.string().min(1).max(60)).max(4).default([]).describe('For kind "question": 2 to 4 short answers the presenter can tap.'),
    },
  }, async (ask) => asText(await askWithHeartbeat(show, ask)));
  server.registerTool('report_booking', {
    description: 'Tell Mission Control what you just booked on the site, with the total price shown on the page.',
    inputSchema: { item: z.enum(['flight', 'hotel']), label: z.string().min(1).max(120), price: z.number().nonnegative() },
  }, async ({ item, label, price }) => {
    show.record('step', { kind: 'Booked', text: `${item}: ${label} for $${price}` });
    return asText(await show.checkInbox());
  });
  server.registerTool('finish', {
    description: 'End the mission with a short, honest summary for Tomer, including anything you refused to do and why.',
    inputSchema: { summary: z.string().min(1).max(800) },
  }, async ({ summary }) => { show.finish(summary); return asText({ ok: true }); });
  if (decider) registerDecide(server, show, decider);
  return server;
}

export function createMcpHandler(show: Show, decider?: Decider) {
  return async (req: IncomingMessage, res: ServerResponse, body: unknown): Promise<void> => {
    const server = buildMcpServer(show, decider);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  };
}
