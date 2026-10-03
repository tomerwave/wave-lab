import { fixtureOrigin, type Interaction } from './webmcp.js';
import { PresenterSession } from './session.js';
import { startPresenterInput } from './cli-controls.js';
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
const USAGE = `Usage: npm run demo:vacation -- <${SCENARIO_NAMES.join('|')}> [--chooser ${CHOOSERS.join('|')}] [--browser ${BROWSERS.join('|')}] [--planner ${PLANNERS.join('|')}] [--interaction dom|webmcp] [--interactive] [--site-url URL]`;
const PLANNER_TIMEOUT_MS = 180_000;

type Options = { scenario: Scenario; chooser: string; browser: string; planner: string; interactive: boolean; interaction: Interaction; siteUrl?: string };
type OpenedBrowser = { browser: BrowserSession; start?: () => Promise<string> };

function parseOptions(): Options {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      chooser: { type: 'string', default: 'scripted' },
      browser: { type: 'string', default: 'local' },
      planner: { type: 'string', default: 'none' },
      interaction: { type: 'string', default: 'dom' },
      interactive: { type: 'boolean', default: false },
      'site-url': { type: 'string' },
    },
  });
  const name = positionals[0] ?? 'sold-out';
  const valid = isScenarioName(name) && CHOOSERS.includes(values.chooser) && BROWSERS.includes(values.browser) && PLANNERS.includes(values.planner) && ['dom', 'webmcp'].includes(values.interaction);
  if (!valid) throw new Error(USAGE);
  if (values.interaction === 'webmcp') {
    if (values.browser !== 'local' || !values['site-url']) throw new Error('WebMCP requires --browser local and --site-url HTTPS/localhost');
    fixtureOrigin(values['site-url']);
  }
  return { scenario: createScenario(name), chooser: values.chooser, browser: values.browser, planner: values.planner, interaction: values.interaction as Interaction, interactive: values.interactive, siteUrl: values['site-url'] };
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

async function openBrowser(kind: string, interaction: Interaction): Promise<OpenedBrowser> {
  if (kind === 'local') return { browser: await launchLocalBrowser({ ...loadRunConfig(), interaction }) };
  const session = createAgentCoreBrowser(loadAwsConfig().region);
  writeLine('AGENTCORE BROWSER. A remote browser session starts in your AWS account.');
  return { browser: session, start: () => session.start() };
}

async function runPlanner(options: Options, run: () => Promise<Outcome>, stopSignal?: AbortSignal): Promise<void> {
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
  const timeout = AbortSignal.timeout(PLANNER_TIMEOUT_MS);
  const cancelSignal = stopSignal ? AbortSignal.any([timeout, stopSignal]) : timeout;
  const result = await planner.invoke('Find a hotel for this trip.', { cancelSignal });
  writeLine(`planner: ${result.toString()}`);
  if (failure) throw failure;
}

async function runSession(options: Options, opened: OpenedBrowser, chooser: Chooser, requestReset: () => void): Promise<void> {
  const mode = `${options.chooser === 'jev' ? 'live Jev' : options.chooser} / ${options.interaction} interaction / ${options.browser} browser / ${options.planner} planner`;
  const presenter = options.interactive ? new PresenterSession(options.scenario, mode) : undefined;
  const input = startPresenterInput(presenter, () => { requestReset(); presenter?.stop(); });
  const run = async () => {
    const outcome = await findHotel({ browser: opened.browser, chooser, scenario: options.scenario, siteUrl: options.siteUrl, interaction: options.interaction, presenter, maxSteps: presenter ? 50 : undefined, onStep: event => formatStep(event).forEach(writeLine) });
    writeLine(formatOutcome(outcome));
    return outcome;
  };
  try {
    if (options.planner === 'strands') await runPlanner(options, run, presenter?.signal);
    else await run();
  } finally { input?.close(); }
}

async function attemptSearch(options: Options, opened: OpenedBrowser, chooser: Chooser): Promise<boolean> {
  let restart = false;
  try { await runSession(options, opened, chooser, () => { restart = true; }); }
  catch (error) { if (!restart) throw error; }
  return restart;
}
async function runSearch(options: Options, opened: OpenedBrowser, chooser: Chooser): Promise<void> {
  if (options.interaction === 'webmcp') writeLine('WEBMCP INTERACTION. Native page tools; DOM observation and code policy checks.');
  if (options.siteUrl) writeLine(`website: ${options.siteUrl}`);
  if (opened.start) writeLine(`live view: ${await opened.start()}`);
  while (await attemptSearch(options, opened, chooser)) chooser = createChooser(options.chooser);
}

async function main(): Promise<void> {
  const options = parseOptions();
  writeLine('FICTIONAL HOTEL SITE. NO REAL BOOKING OR PAYMENT.');
  writeLine(`scenario: ${options.scenario.name}, budget ${options.scenario.goal.budgetEur} EUR, accessibility required`);
  const chooser = createChooser(options.chooser);
  const opened = await openBrowser(options.browser, options.interaction);
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
