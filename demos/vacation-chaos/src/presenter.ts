import type { AgentLauncher } from './launcher.js';
import type { Show } from './show/engine.js';
import type { RunMode } from './show/types.js';
import { handleSite } from './site/handler.js';
import { runReplay } from './replay.js';

type Payload = Record<string, unknown>;
type Action = (show: Show, body: Payload, launcher: AgentLauncher) => unknown;

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const runModes: RunMode[] = ['replay', 'local', 'agentcore'];

function startReplay(show: Show): void {
  show.reset('replay');
  show.beginOpening();
  void runReplay(show, (req) => handleSite(show, req));
}

function startLive(show: Show, body: Payload, launcher: AgentLauncher): void {
  const mode = runModes.find((m) => m === str(body.runtime)) ?? 'local';
  show.reset(mode);
  show.beginOpening();
  if (body.launch !== false) launcher.launch(mode);
}

function startTurbo(show: Show, body: Payload, launcher: AgentLauncher): void {
  const last = show.snapshot().mission;
  const winners = [...show.lastWinners].filter((id) => !['oil-shock', 'intern-deploy'].includes(id));
  const mode = runModes.find((m) => m === str(body.runtime)) ?? show.snapshot().runMode;
  show.reset(mode === 'idle' ? 'replay' : mode);
  show.setPace('turbo');
  show.prefillMission(last.destination ?? 'Lisbon', last.rule);
  winners.forEach((id) => show.applyTwist(id));
  if (show.snapshot().runMode === 'replay') void runReplay(show, (req) => handleSite(show, req));
  else launcher.launch(show.snapshot().runMode);
}

export const ACTIONS: Record<string, Action> = {
  'start-replay': (show) => startReplay(show),
  'start-live': startLive,
  turbo: startTurbo,
  vote: (show, b) => show.openVote('chaos', Array.isArray(b.options) ? b.options.map(String) : undefined),
  'close-vote': (show) => show.closeVote(),
  'extend-vote': (show) => show.extendVote(15_000),
  twist: (show, b) => show.applyTwist(str(b.id) ?? ''),
  checkpoint: (show, b) => show.checkpoint(Number(b.index)),
  pace: (show, b) => show.setPace(b.pace === 'turbo' ? 'turbo' : 'story'),
  answer: (show, b) => show.answer(str(b.text) ?? 'OK', b.approve === true),
  captcha: (show) => { show.site.captcha = 'solved'; show.record('step', { kind: 'Human', text: 'The presenter solved the human check' }); },
  'launch-agent': (show, b, launcher) => launcher.launch(str(b.runtime) ?? show.snapshot().runMode, str(b.model) ? ['--model', str(b.model)!] : []),
  'stop-agent': (_show, _b, launcher) => launcher.stop(),
  reset: (show, _b, launcher) => { launcher.stop(); show.reset('idle'); },
};
