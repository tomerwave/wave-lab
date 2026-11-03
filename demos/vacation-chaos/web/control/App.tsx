import type { ReactNode } from 'react';
import { AskPanel } from './Ask';
import { Backstage } from './Backstage';
import { AgentBrowser } from './AgentBrowser';
import { Header, Sidebar, Telemetry } from './Dashboard';
import { useMoments } from './moments';
import { isPresenter } from './presenter';
import { useNow, useShow, type Live, type Wire } from './show';
import { Stage } from './Stage';
import { Talk } from './talk/Talk';
import { Tour } from './Tour';
import { HeadsUpBanner, PausedBanner, VotePanel } from './Vote';

function Overlays({ snap, serverNow }: { snap: Wire; serverNow: number }) {
  const { vote, pendingAsk, pausedAt } = snap;
  const paused = pausedAt !== null;
  if (pendingAsk) return <AskPanel ask={pendingAsk} />;
  if (vote && serverNow < vote.opensAt) return <HeadsUpBanner vote={vote} serverNow={serverNow} />;
  if (vote) return <VotePanel vote={vote} serverNow={pausedAt ?? serverNow} paused={paused} />;
  return paused ? <PausedBanner /> : null;
}

function Show({ live: { snap, offset } }: { live: Live }) {
  const now = useNow(250);
  const moment = useMoments(snap, offset, now);
  return (
    <div className="flex h-full flex-col gap-4 px-6 pb-4 pt-5 text-sm">
      <Header snap={snap} />
      <main className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-4">
        <AgentBrowser snap={snap} />
        <Sidebar snap={snap} />
      </main>
      <Telemetry snap={snap} />
      <Stage snap={snap} moment={moment} />
      <Overlays snap={snap} serverNow={now + offset} />
      {isPresenter && <Backstage />}
    </div>
  );
}

function MissionControl() {
  const live = useShow();
  return live ? <Show live={live} /> : null;
}

const PAGES: Record<string, () => ReactNode> = { '/tour': Tour, '/talk': Talk };

export function App() {
  const Page = PAGES[location.pathname] ?? MissionControl;
  return <Page />;
}
