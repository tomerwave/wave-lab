import { StageController, type StageSelector } from './stage-controller.js';
import { LocalAutonomousBrowser } from './stage-local-browser.js';
export class LocalJevController extends StageController {
  constructor(private readonly local: LocalAutonomousBrowser, select: StageSelector) { super(local, select); }
  async frame(): Promise<Buffer> { return this.local.screenshot(); }
}
