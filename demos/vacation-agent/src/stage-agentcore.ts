import { PlaywrightBrowser } from 'bedrock-agentcore/browser/playwright';
import { toDataUrl } from './agentcore-browser.js';
import type { StageBrowser, StageObservation } from './stage-controller.js';
import { offersFor, type StageState } from './stage-state.js';
import { renderStageSite } from './stage-site.js';
export interface StageRemote {
  startSession(params: { sessionName: string; timeout: number; viewport: { width: number; height: number } }): Promise<unknown>;
  generateLiveViewUrl(expiresIn: number): Promise<string>;
  navigate(params: { url: string; timeout: number }): Promise<void>;
  evaluate(params: { script: string }): Promise<unknown>;
  click(params: { selector: string; timeout: number }): Promise<void>;
  stopSession(): Promise<void>;
}
export class AgentCoreStageBrowser implements StageBrowser {
  private closed = false; private starting?: Promise<unknown>; private closeTask?: Promise<void>;
  constructor(private readonly remote: StageRemote) {}
  async start(): Promise<string> {
    this.check(); this.starting = this.remote.startSession({ sessionName: 'vacation-stage-fictional', timeout: 1200, viewport: { width: 1920, height: 1080 } });
    try {
      await this.starting; this.check();
      await this.remote.navigate({ url: toDataUrl(renderStageSite()), timeout: 15000 }); this.check();
      return await this.remote.generateLiveViewUrl(1200);
    } finally { if (this.closed) await this.remote.stopSession(); }
  }
  async sync(state: StageState): Promise<void> {
    this.check(); const data = { revision: state.revision, iran: state.world.iran, offers: offersFor(state) };
    await this.remote.evaluate({ script: `window.__stageSync(${JSON.stringify(data)})` }); this.check();
  }
  async observe(): Promise<StageObservation> {
    this.check(); const page = await this.remote.evaluate({ script: 'window.__stageObserve()' }); this.check();
    if (!page || typeof page !== 'object' || !('offers' in page) || !Array.isArray(page.offers)) throw new Error('Invalid fictional site observation');
    return page as StageObservation;
  }
  async act(id: string): Promise<void> {
    this.check(); if (!/^(inspect|review):[a-z-]+$/.test(id)) throw new Error('No such browser tool');
    if (id.startsWith('inspect:')) await this.openResults();
    await this.remote.click({ selector: `button[data-action="${id}"]`, timeout: 15000 }); this.check();
  }
  private async openResults(): Promise<void> {
    const page = await this.observe();
    if (page.view === 'results') return;
    this.check(); await this.remote.click({ selector: '#back', timeout: 15000 }); this.check();
  }
  async close(): Promise<void> {
    this.closed = true;
    this.closeTask ??= this.remote.stopSession().then(() => undefined);
    await this.closeTask;
  }
  private check(): void { if (this.closed) throw new Error('Browser is stopped'); }
}
export function createStageAgentCore(region: string): StageBrowser { return new AgentCoreStageBrowser(new PlaywrightBrowser({ region })); }
