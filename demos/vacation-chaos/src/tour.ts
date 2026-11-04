import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { createHighlighter, type Highlighter } from 'shiki';
import { Show } from './show/engine.js';
import { pageDigest } from './site/digest.js';
import { handleSite } from './site/handler.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const THEME = 'github-dark';
const LANGS = { md: 'markdown', py: 'python', ts: 'typescript' } as const;
const PRETTIER = { parser: 'typescript', singleQuote: true, printWidth: 96, trailingComma: 'all' } as const;

type Ext = keyof typeof LANGS;
interface Part { from: string; lines: number; raw?: boolean }
interface Stop { title: string; why: string; file: string; parts: Part[]; views?: boolean }
export interface CodeToken { text: string; color: string }
export interface SiteView { title: string; note: string; bytes: number; text: string }
export interface TourStop { title: string; why: string; file: string; start: number; code: string; tokens: CodeToken[][]; views?: SiteView[] }

const STOPS: Stop[] = [
  { title: 'The mission, in plain English', why: 'The whole agent starts as a prompt. No code decides what to book.', file: 'agent/prompt.md', parts: [{ from: 'You are', lines: 11 }] },
  { title: 'The agent is configuration', why: 'A managed Harness is a declaration: model, prompt, tools, memory and limits. AgentCore runs the loop.', file: 'agent/harness.py', parts: [{ from: 'def harness_config', lines: 12 }] },
  { title: 'Two kinds of tools', why: 'AgentCore Browser is built in. Our show tools arrive as a remote MCP server, added per run with its own auth headers.', file: 'agent/harness.py', parts: [{ from: 'BROWSER = ', lines: 2 }, { from: 'def run_tools', lines: 3 }] },
  { title: 'One call runs it', why: 'A session id, an actor id for memory, and a streamed response. Swap the model per call for a brain transplant.', file: 'agent/harness.py', parts: [{ from: 'def invoke', lines: 18 }] },
  { title: 'The tools the agent can call', why: 'Plain MCP tools on the show server. Each one is a name, a description for the model, and a schema. The agent never touches money.', file: 'src/mcp.ts', parts: [{ from: "server.registerTool('think_aloud'", lines: 4 }, { from: "server.registerTool('ask_presenter'", lines: 8 }] },
  { title: 'Jev is a tool we hand the model', why: 'The model calls jev_decide with the options. Jev picks with a confidence score, and the prompt says the rules beat Jev. The key stays on our server.', file: 'src/mcp.ts', parts: [{ from: 'function registerDecide', lines: 10 }] },
  { title: 'A site built for agents', why: 'Same page, three ways to see it. By Kyle Jeong\'s reading of the source, GPT-6 Astra uses the accessibility tree, not only screenshots: fewer tokens, fewer turns. Our agent gets the same benefit from a short text page.', file: 'src/site/layout.ts', parts: [{ from: 'export const act', lines: 1 }], views: true },
  { title: 'Guardrails live on the server', why: 'The budget you picked is saved in the SunnyHop account. The site enforces it and the human check, not the model.', file: 'src/site/handler.ts', parts: [{ from: 'function pay', lines: 13 }] },
  { title: 'Chaos is just data', why: 'Each twist is a small object: what it changes, what the agent hears, and how Mission Control shows it.', file: 'src/show/twists.ts', parts: [{ from: "id: 'oil-shock'", lines: 7, raw: true }] },
];

async function pick(lines: string[], part: Part, ext: Ext): Promise<{ start: number; code: string }> {
  const index = lines.findIndex((line) => line.includes(part.from));
  if (index < 0) throw new Error(`Tour stop not found: ${part.from}`);
  const code = lines.slice(index, index + part.lines).join('\n');
  const tidy = ext === 'ts' && !part.raw;
  return { start: index + 1, code: tidy ? (await format(code, PRETTIER)).trim() : code.replace(/^\s*\n|\s+$/g, '') };
}

let highlighter: Promise<Highlighter> | null = null;

function shiki(): Promise<Highlighter> {
  highlighter ??= createHighlighter({ themes: [THEME], langs: Object.values(LANGS) });
  return highlighter;
}

async function colour(code: string, ext: Ext): Promise<CodeToken[][]> {
  const { tokens } = (await shiki()).codeToTokens(code, { lang: LANGS[ext], theme: THEME });
  return tokens.map((line) => line.map(({ content, color }) => ({ text: content, color: color ?? '#e4e4e7' })));
}

const ROLES: Record<string, string> = { a: 'link', button: 'button', input: 'textbox' };

function accessibilityTree(html: string): string {
  const controls = [...html.matchAll(/<(a|button|input)\b[^>]* id="[^"]+" data-label="([^"]+)"/g)];
  return controls.map(([, tag = '', label]) => `${ROLES[tag]} "${label}"`).join('\n');
}

async function siteViews(): Promise<SiteView[]> {
  const show = new Show({ sleep: async () => undefined });
  show.site.searched = 'Lisbon';
  const { html } = await handleSite(show, { method: 'GET', path: '/site/flights', form: {}, mirror: true });
  const body = html.slice(Math.max(0, html.indexOf('<body')));
  const digest = pageDigest(html);
  const tree = accessibilityTree(html);
  return [
    { title: 'The HTML', note: 'What a scraper gets', bytes: html.length, text: body },
    { title: 'The accessibility tree', note: 'Roles and names: what screen readers and Astra use', bytes: tree.length, text: tree },
    { title: 'What our agent reads', note: 'The page field in each tool reply', bytes: digest.length, text: digest },
  ];
}

async function excerpt(stop: Stop): Promise<TourStop> {
  const ext = stop.file.split('.').pop() as Ext;
  const lines = (await readFile(`${ROOT}${stop.file}`, 'utf8')).split('\n');
  const parts = await Promise.all(stop.parts.map((part) => pick(lines, part, ext)));
  const code = parts.map((part) => part.code).join('\n\n');
  const tour: TourStop = { title: stop.title, why: stop.why, file: stop.file, start: parts[0]?.start ?? 1, code, tokens: await colour(code, ext) };
  return stop.views ? { ...tour, views: await siteViews() } : tour;
}

export const codeTour = (): Promise<TourStop[]> => Promise.all(STOPS.map(excerpt));
