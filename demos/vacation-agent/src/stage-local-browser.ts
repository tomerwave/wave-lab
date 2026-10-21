import { chromium, type Browser, type Page } from 'playwright';
import type { StageBrowser, StageObservation } from './stage-controller.js';
import { offersFor, type StageState } from './stage-state.js';
import { renderStageSite } from './stage-site.js';
import type { LocalBrowserOptions } from './local-browser.js';
export class LocalAutonomousBrowser implements StageBrowser {
  private browser?: Browser; private page?: Page; private closed = false;
  constructor(private readonly options: LocalBrowserOptions) {}
  async start(): Promise<string> {
    this.browser = await chromium.launch({ executablePath: this.options.executablePath, headless: !this.options.headed, slowMo: this.options.slowMoMs });
    if (this.closed) { await this.browser.close(); throw new Error('Local browser stopped'); }
    this.page = await this.browser.newPage({ viewport: { width: 1440, height: 900 } });
    await this.page.setContent(renderStageSite()); this.check(); return '';
  }
  async sync(state: StageState): Promise<void> {
    await this.check().evaluate(data => (window as unknown as { __stageSync(d: unknown): void }).__stageSync(data), { revision: state.revision, iran: state.world.iran, offers: offersFor(state) });
  }
  async observe(): Promise<StageObservation> {
    return this.check().evaluate(() => (window as unknown as { __stageObserve(): StageObservation }).__stageObserve());
  }
  async act(id: string): Promise<void> {
    if (!/^(inspect|review):[a-z-]+$/.test(id)) throw new Error('Unknown local browser action');
    if (id.startsWith('inspect:')) await this.results();
    await this.check().locator(`[data-action="${id}"]`).click({ timeout: 5000 }); this.check();
  }
  private async results(): Promise<void> {
    const state = await this.observe();
    if (state.view !== 'results') await this.check().locator('#back').click({ timeout: 5000 });
  }
  async close(): Promise<void> { this.closed = true; await this.browser?.close(); }
  private check(): Page { if (this.closed || !this.page) throw new Error('Local browser stopped or not started'); return this.page; }
}
