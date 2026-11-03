import type { ActiveVote } from '../../src/show/engine';
import { Backstage } from './Backstage';
import { AgentBrowser, Header, Sidebar, Telemetry } from './Dashboard';
import { useMoments } from './moments';
import { isPresenter } from './presenter';
import { useNow, useShow, type Live } from './show';
import { Stage } from './Stage';

const secondsLeft = (vote: ActiveVote | null, serverNow: number) => (vote ? Math.max(0, Math.ceil((vote.closesAt - serverNow) / 1000)) : 0);

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
      <Stage snap={snap} moment={moment} secondsLeft={secondsLeft(snap.vote, now + offset)} />
      {isPresenter && <Backstage />}
    </div>
  );
}

export function App() {
  const live = useShow();
  return live ? <Show live={live} /> : null;
}
