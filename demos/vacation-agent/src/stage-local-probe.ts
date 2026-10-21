import { JevBudget } from './stage-budget.js';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { loadJevConfig, loadRunConfig, loadLocalJevConfig } from './config.js';
import { StageController } from './stage-controller.js';
import { createStageSelector, type StageUsage } from './stage-jev.js';
import { LocalAutonomousBrowser } from './stage-local-browser.js';
import { writeLine, writeError } from './output.js';
async function main(): Promise<void> {
  if (!process.argv.includes('--run-approved-validation')) throw new Error('Not run: explicitly pass --run-approved-validation for the additional USD1 validation approval. No AWS is used.');
  const { apiKey } = loadJevConfig();
  const browser = new LocalAutonomousBrowser({ ...loadRunConfig(), headed: true });
  const budget = new JevBudget(loadLocalJevConfig().ledgerPath);
  const client = new TypeSafeClient({ apiKey, defaultModel: 'jev-1.13.0', baseURL: 'https://api.typesafe.ai', logLevel: 'off', retry: { maxRetries: 0 }, fetch: budget.fetch });
  let usage: StageUsage | undefined;
  const controller = new StageController(browser, createStageSelector(client, value => { usage = value; }));
  writeLine('REAL JEV DECISION / REAL LOCAL CHROMIUM. No AWS. One decision until first semantic checkpoint or human question; no retries; persistent request budget.');
  try { await controller.start(); await controller.pump(); writeLine(JSON.stringify({ mode: 'real-jev-local-browser', budget: budget.summary(), usage, run: controller.snapshot() }, null, 2)); }
  finally { await controller.stop(); }
}
main().catch(error => { writeError(error instanceof Error ? error.message : 'Local probe failed'); process.exitCode = 1; });
