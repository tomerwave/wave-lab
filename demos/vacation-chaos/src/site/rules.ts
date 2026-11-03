import type { Show } from '../show/engine.js';
import type { SiteRequest } from './handler.js';

type Rule = { match: (req: SiteRequest) => boolean; run: (show: Show) => void };

const isGet = (path: RegExp) => (req: SiteRequest) => req.method === 'GET' && path.test(req.path);

function openChaosVote(show: Show, nth: number): void {
  if (show.autoVotes && show.chaosVotes === nth && show.mission.ready) show.openVote('chaos');
}

function hotelsLoaded(show: Show): void {
  if (show.applied.includes('intern-deploy')) return;
  show.applyTwist('intern-deploy');
  show.checkpoint(7);
}

const RULES: Rule[] = [
  { match: isGet(/^\/site\/?$/), run: (s) => s.checkpoint(3) },
  { match: isGet(/^\/site\/flights\/?$/), run: (s) => { s.checkpoint(3); s.applyTwist('oil-shock'); s.checkpoint(4); } },
  { match: isGet(/^\/site\/flights\/[a-z]+$/), run: (s) => openChaosVote(s, 0) },
  { match: (r) => r.method === 'POST' && /^\/site\/flights\/[a-z]+\/book$/.test(r.path), run: (s) => s.checkpoint(6) },
  { match: isGet(/^\/site\/hotels\/?$/), run: hotelsLoaded },
  { match: isGet(/^\/site\/hotels\/[a-z0-9]+$/), run: (s) => { s.checkpoint(9); openChaosVote(s, 1); } },
  { match: isGet(/^\/site\/checkout$/), run: (s) => { s.checkpoint(11); if (s.site.captcha === 'off') s.site.captcha = 'pending'; } },
];

export function beforeRequest(show: Show, req: SiteRequest): void {
  for (const rule of RULES) if (rule.match(req)) rule.run(show);
}
