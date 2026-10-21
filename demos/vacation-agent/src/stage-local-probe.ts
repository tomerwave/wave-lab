import { TypeSafeClient } from '@typesafe-ai/sdk';
import { loadJevConfig, loadRunConfig } from './config.js';
import { StageController } from './stage-controller.js';
import { createStageSelector, type StageUsage } from './stage-jev.js';
import { LocalAutonomousBrowser } from './stage-local-browser.js';
import { writeLine, writeError } from './output.js';
async function main(): Promise<void> {
  if (!process.argv.includes('--run-within-existing-budget')) throw new Error('Not run: first reconcile remaining balance within the existing $2 total cap. Then explicitly pass --run-within-existing-budget. No AWS is used.');
  const { apiKey } = loadJevConfig();
  const browser = new LocalAutonomousBrowser({ ...loadRunConfig(), headed: true });
  const client = new TypeSafeClient({ apiKey, logLevel: 'off', retry: { maxRetries: 1 } });
  let usage: StageUsage | undefined;
  const controller = new StageController(browser, createStageSelector(client, value => { usage = value; }));
  writeLine('REAL JEV DECISION / REAL LOCAL CHROMIUM. No AWS. One decision until first semantic checkpoint or human question; at most one retry.');
  try { await controller.start(); await controller.pump(); writeLine(JSON.stringify({ mode: 'real-jev-local-browser', usage, run: controller.snapshot() }, null, 2)); }
  finally { await controller.stop(); }
}
main().catch(error => { writeError(error instanceof Error ? error.message : 'Local probe failed'); process.exitCode = 1; });
