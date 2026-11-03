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
}

export interface Twist {
  id: string;
  label: string;
  blurb: string;
  kind: 'vote' | 'auto';
  inbox: string;
  apply(mission: Mission, site: SiteMode, now: number): void;
  replay: string[];
}

export interface VoteOption {
  id: string;
  label: string;
}

export const START_BUDGET = 2400;
export const OUTAGE_MS = 10_000;

export function freshMission(): Mission {
  return { ready: false, travellers: ['Tomer'], partySize: 1, destination: null, rule: null, budget: START_BUDGET, nights: 5, musts: [], nevers: [], persona: null };
}

export function freshSite(): SiteMode {
  return { news: null, skin: 'normal', fareMultiplier: 1, outageUntil: null, darkPatterns: false, haggle: false, captcha: 'off', flightCancelled: false, avoidFlight: null };
}
