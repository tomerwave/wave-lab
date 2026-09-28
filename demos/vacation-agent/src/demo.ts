import { parseArgs } from 'node:util';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { createAgentCoreBrowser } from './agentcore-browser.js';
import type { BrowserSession } from './browser.js';
import type { Chooser } from './chooser.js';
import { loadAwsConfig, loadJevConfig, loadRunConfig } from './config.js';
import { createScenario, isScenarioName, SCENARIO_NAMES, type Scenario } from './hotels.js';
import { createJevChooser } from './jev.js';
import { launchLocalBrowser } from './local-browser.js';
import { findHotel, type Outcome } from './loop.js';
import { writeError, writeLine } from './output.js';
import { createPlanner } from './planner.js';
import { createCarelessChooser, createScriptedChooser } from './scripted.js';
import { formatOutcome, formatStep } from './trace.js';

const CHOOSERS = ['scripted', 'careless', 'jev'];
const BROWSERS = ['local', 'agentcore'];
const PLANNERS = ['none', 'strands'];
const USAGE = `Usage: npm run demo:vacation -- <${SCENARIO_NAMES.join('|')}> [--chooser ${CHOOSERS.join('|')}] [--browser ${BROWSERS.join('|')}] [--planner ${PLANNERS.join('|')}]`;
const PLANNER_TIMEOUT_MS = 180_000;

type Options = { scenario: Scenario; chooser: string; browser: string; planner: string };
type OpenedBrowser = { browser: BrowserSession; start?: () => Promise<string> };

function parseOptions(): Options {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      chooser: { type: 'string', default: 'scripted' },
      browser: { type: 'string', default: 'local' },
      planner: { type: 'string', default: 'none' },
    },
  });
  const name = positionals[0] ?? 'sold-out';
  const valid = isScenarioName(name) && CHOOSERS.includes(values.chooser) && BROWSERS.includes(values.browser) && PLANNERS.includes(values.planner);
  if (!valid) throw new Error(USAGE);
  return { scenario: createScenario(name), chooser: values.chooser, browser: values.browser, planner: values.planner };
}

function createChooser(kind: string): Chooser {
  if (kind === 'careless') {
    writeLine('SCRIPTED CARELESS CHOICES. NO MODEL CALL. Shows the code rejecting a valid but wrong choice.');
    return createCarelessChooser();
  }
  if (kind === 'jev') {
    const { apiKey } = loadJevConfig();
    writeLine('LIVE JEV CHOICES. The compact page state is sent to TypeSafe AI.');
    return createJevChooser(new TypeSafeClient({ apiKey }));
  }
  writeLine('SCRIPTED CHOICES. NO MODEL CALL.');
  return createScriptedChooser();
}

async function openBrowser(kind: string): Promise<OpenedBrowser> {
  if (kind === 'local') return { browser: await launchLocalBrowser(loadRunConfig()) };
  const session = createAgentCoreBrowser(loadAwsConfig().region);
  writeLine('AGENTCORE BROWSER. A remote browser session starts in your AWS account.');
  return { browser: session, start: () => session.start() };
}

async function runPlanner(options: Options, run: () => Promise<Outcome>): Promise<void> {
  const aws = loadAwsConfig();
  writeLine(`STRANDS PLANNER on Amazon Bedrock (${aws.plannerModelId}).`);
  let failure: unknown;
  const guarded = async () => {
    try {
      return await run();
    } catch (error) {
      failure = error;
      throw error;
    }
  };
  const planner = createPlanner({ region: aws.region, modelId: aws.plannerModelId, goal: options.scenario.goal, findHotel: guarded });
  const result = await planner.invoke('Find a hotel for this trip.', { cancelSignal: AbortSignal.timeout(PLANNER_TIMEOUT_MS) });
  writeLine(`planner: ${result.toString()}`);
  if (failure) throw failure;
}

async function runSearch(options: Options, opened: OpenedBrowser, chooser: Chooser): Promise<void> {
  if (opened.start) writeLine(`live view: ${await opened.start()}`);
  const run = async () => {
    const outcome = await findHotel({ browser: opened.browser, chooser, scenario: options.scenario, onStep: event => formatStep(event).forEach(writeLine) });
    writeLine(formatOutcome(outcome));
    return outcome;
  };
  if (options.planner === 'strands') await runPlanner(options, run);
  else await run();
}

async function main(): Promise<void> {
  const options = parseOptions();
  writeLine('FICTIONAL HOTEL SITE. NO REAL BOOKING OR PAYMENT.');
  writeLine(`scenario: ${options.scenario.name}, budget ${options.scenario.goal.budgetEur} EUR, accessibility required`);
  const chooser = createChooser(options.chooser);
  const opened = await openBrowser(options.browser);
  try {
    await runSearch(options, opened, chooser);
  } finally {
    await opened.browser.close();
  }
}

main().catch(error => {
  writeError(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
