export type Pace = 'story' | 'turbo';
export type RunMode = 'idle' | 'replay' | 'local' | 'agentcore';

export interface Mission {
  ready: boolean;
  travellers: string[];
  partySize: number;
  destination: string | null;
  rule: string | null;
  budget: number;
  nights: number;
  musts: string[];
  nevers: string[];
  persona: string | null;
}

export interface SiteMode {
  news: string | null;
  skin: 'normal' | 'takeover';
  fareMultiplier: number;
  outageUntil: number | null;
  darkPatterns: boolean;
  haggle: boolean;
  captcha: 'off' | 'pending' | 'solved';
  flightCancelled: boolean;
  avoidFlight: string | null;
  searched: string | null;
}

export type TwistLook = 'news' | 'message' | 'alert' | 'status' | 'post';

export interface Twist {
  id: string;
  label: string;
  blurb: string;
  kind: 'vote' | 'auto';
  look: TwistLook;
  kicker: string;
  headline: string;
  effect: string;
  sticker: string;
  lines: string[];
  flightOnly?: boolean;
  inbox: string;
  apply(mission: Mission, site: SiteMode, now: number): void;
  replay: string[];
}

export type AskKind = 'approval' | 'human-check' | 'question';

export interface Ask {
  question: string;
  kind: AskKind;
  options: string[];
}

export interface VoteOption {
  id: string;
  label: string;
  blurb?: string;
}

export const START_BUDGET = 2400;
export const SCREEN_MS = { result: 6000, twist: 8000, booking: 4000, rest: 3000 };
export const OUTAGE_MS = 10_000;

export function freshMission(budget = START_BUDGET): Mission {
  return { ready: false, travellers: ['Tomer'], partySize: 1, destination: null, rule: null, budget, nights: 5, musts: [], nevers: [], persona: null };
}

export function freshSite(): SiteMode {
  return { news: null, skin: 'normal', fareMultiplier: 1, outageUntil: null, darkPatterns: false, haggle: false, captcha: 'off', flightCancelled: false, avoidFlight: null, searched: null };
}
