import type { Show } from '../show/engine.js';
import type { SiteRequest } from './handler.js';

type Rule = { match: (req: SiteRequest) => boolean; run: (show: Show) => void };

const isGet = (path: RegExp) => (req: SiteRequest) => req.method === 'GET' && path.test(req.path);

function openChaosVote(show: Show, nth: number): void {
  if (show.autoVotes && show.chaosVotes === nth && show.mission.ready) show.openVote('chaos');
}

const RULES: Rule[] = [
  { match: isGet(/^\/site\/flights\/?$/), run: (s) => { if (s.site.searched) s.applyTwist('oil-shock'); } },
  { match: isGet(/^\/site\/flights\/[a-z]+$/), run: (s) => openChaosVote(s, 0) },
  { match: isGet(/^\/site\/hotels\/?$/), run: (s) => s.applyTwist('intern-deploy') },
  { match: isGet(/^\/site\/hotels\/[a-z0-9]+$/), run: (s) => openChaosVote(s, 1) },
  { match: isGet(/^\/site\/checkout$/), run: (s) => { if (s.site.captcha === 'off') s.site.captcha = 'pending'; } },
];

export function beforeRequest(show: Show, req: SiteRequest): void {
  for (const rule of RULES) if (rule.match(req)) rule.run(show);
}
