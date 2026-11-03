import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Show, ToolReply } from './show/engine.js';

const asText = (value: ToolReply | Record<string, unknown>) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });

export function buildMcpServer(show: Show): McpServer {
  const server = new McpServer({ name: 'vacation-chaos-show', version: '1.0.0' });
  server.registerTool('think_aloud', {
    description: 'Say what you are about to do and why, in one or two short sentences the audience will read. Call this before every browser action. Returns the current mission and any new messages.',
    inputSchema: { thought: z.string().min(1).max(400) },
  }, async ({ thought }) => asText(await show.think(thought)));
  server.registerTool('check_inbox', {
    description: 'Get the current mission and any new messages from Tomer, the boss or the world. Call this first, and whenever you finish a step.',
    inputSchema: {},
  }, async () => asText(await show.checkInbox()));
  server.registerTool('ask_presenter', {
    description: 'Ask the human presenter a question and wait for the answer. Use it before paying over budget and whenever a human check (CAPTCHA) appears.',
    inputSchema: { question: z.string().min(1).max(300) },
  }, async ({ question }) => asText({ answer: await show.ask(question) }));
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
  return server;
}

export function createMcpHandler(show: Show) {
  return async (req: IncomingMessage, res: ServerResponse, body: unknown): Promise<void> => {
    const server = buildMcpServer(show);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  };
}
