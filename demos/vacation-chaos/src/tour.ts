import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

interface Stop { title: string; why: string; file: string; from: string; lines: number }
export interface TourStop { title: string; why: string; file: string; start: number; code: string }

const STOPS: Stop[] = [
  { title: 'The mission, in plain English', why: 'The whole agent starts as a prompt. No code decides what to book; the model reads this and the page.', file: 'agent/prompt.md', from: 'You are', lines: 14 },
  { title: 'The agent is configuration', why: 'A managed Harness is a declaration: model, prompt, tools, memory and limits. AgentCore runs the loop.', file: 'agent/harness.py', from: 'def harness_config', lines: 16 },
  { title: 'Tools: a real browser and our MCP server', why: 'AgentCore Browser is built in. Our show tools arrive as a remote MCP server, added per run with its own auth headers.', file: 'agent/harness.py', from: 'BROWSER = ', lines: 14 },
  { title: 'One call runs it', why: 'invoke_harness with a session id, an actor id for memory, and a streamed response. Swap the model per call for a brain transplant.', file: 'agent/harness.py', from: 'def invoke', lines: 14 },
  { title: 'The tools the agent can call', why: 'think_aloud, check_inbox, ask_presenter and finish are plain MCP tools on the show server. The agent never touches money.', file: 'src/mcp.ts', from: 'export function buildMcpServer', lines: 30 },
  { title: 'Jev makes the three big calls', why: 'A fast decision model picks the flight, the hotel and whether to pay, with a confidence score. The prompt says the rules beat Jev.', file: 'src/jev.ts', from: 'import', lines: 15 },
  { title: 'A site built for agents', why: 'Every button gets a stable id and a hidden Page actions list, so the agent clicks ids instead of guessing selectors.', file: 'src/site/layout.ts', from: 'export const act', lines: 1 },
  { title: 'Guardrails live on the server', why: 'The human check and the budget are enforced by the site, not by asking the model nicely.', file: 'src/site/handler.ts', from: 'function pay', lines: 15 },
  { title: 'Chaos is just data', why: 'Each twist is a small object: what it changes, what the agent hears, and how Mission Control shows it.', file: 'src/show/twists.ts', from: "id: 'oil-shock'", lines: 9 },
];

async function excerpt(stop: Stop): Promise<TourStop> {
  const lines = (await readFile(`${ROOT}${stop.file}`, 'utf8')).split('\n');
  const index = Math.max(0, lines.findIndex((line) => line.includes(stop.from)));
  return { title: stop.title, why: stop.why, file: stop.file, start: index + 1, code: lines.slice(index, index + stop.lines).join('\n') };
}

export const codeTour = (): Promise<TourStop[]> => Promise.all(STOPS.map(excerpt));
