import { useEffect, useState } from 'react';
import type { ControlMeta } from '../../src/screens';
import type { Snapshot } from '../../src/show/engine';

export type Wire = Snapshot & { serverNow: number };
export interface Live { snap: Wire; offset: number }

export const meta: ControlMeta = JSON.parse(document.getElementById('meta')!.textContent!);
export const voteHost = meta.voteUrl.replace(/^https?:\/\//, '');

export function useShow(): Live | null {
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    const events = new EventSource('/events');
    events.onmessage = (e: MessageEvent<string>) => {
      const snap = JSON.parse(e.data) as Wire;
      setLive({ snap, offset: snap.serverNow - Date.now() });
    };
    return () => events.close();
  }, []);
  return live;
}

export function useNow(ms: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
