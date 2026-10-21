import { JevBudget } from './stage-budget.js';
import { LocalJevController } from './stage-local-jev.js';
import { LocalAutonomousBrowser } from './stage-local-browser.js';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { createStageAgentCore } from './stage-agentcore.js';
import { loadAwsConfig, loadJevConfig, loadStageConfig, loadLocalJevConfig, loadRunConfig } from './config.js';
import { StageController } from './stage-controller.js';
import { createStageSelector } from './stage-jev.js';
import { createStageServer } from './stage-server.js';
import { writeError, writeLine } from './output.js';
const config = loadStageConfig();
const local = loadLocalJevConfig();
const budget = new JevBudget(local.ledgerPath);
const app = createStageServer({ autonomousEnabled: local.enabled, budgetSummary: () => budget.summary(), createAutonomousRun: () => {
  const { apiKey } = loadJevConfig();
  const client = new TypeSafeClient({ apiKey, defaultModel: 'jev-1.13.0', baseURL: 'https://api.typesafe.ai', logLevel: 'off', retry: { maxRetries: 0 }, fetch: budget.fetch });
  return new LocalJevController(new LocalAutonomousBrowser({ ...loadRunConfig(), headed: false }), createStageSelector(client));
}, liveEnabled: config.liveEnabled, createRun: () => {
  const aws = loadAwsConfig(); const jev = loadJevConfig();
  return new StageController(createStageAgentCore(aws.region), createStageSelector(new TypeSafeClient({ apiKey: jev.apiKey, logLevel: 'off', timeout: 20000, retry: { maxRetries: 1 } })));
} });
app.server.on('error', () => { writeError('Stage server could not start. Check the local port.'); process.exitCode = 1; });
app.server.listen(config.port, '127.0.0.1', () => writeLine(`Vacation stage: http://127.0.0.1:${config.port} · ${local.enabled ? 'LOCAL Jev enabled within shared USD1 validation cap; no AWS' : 'LOCAL manual rehearsal; paid services gated'}`));
let closing = false;
const close = () => { if (closing) return; closing = true; void app.close().catch(() => { writeError('Session cleanup failed; inspect the owned AgentCore session in AWS. It has a 20-minute expiry.'); process.exitCode = 1; }); };
process.once('SIGINT', close); process.once('SIGTERM', close);
