import { useEffect, useState, type ReactNode } from 'react';
import { AgentSlide, HarnessSlide, OptionsSlide } from './Concepts';
import { Stage } from './Frame';
import { PlanSlide, TitleSlide, WhoSlide } from './Opening';
import { ConfigSlide, RuntimeSlide } from './Platform';

const SLIDES: Array<() => ReactNode> = [TitleSlide, WhoSlide, PlanSlide, AgentSlide, HarnessSlide, OptionsSlide, ConfigSlide, RuntimeSlide];
const FORWARD = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
const BACK = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);

function step(index: number, key: string): number {
  if (FORWARD.has(key)) return index + 1;
  return BACK.has(key) ? Math.max(0, index - 1) : index;
}

function useSlideIndex(): number {
  const [index, setIndex] = useState(() => Math.min(SLIDES.length - 1, Number(new URLSearchParams(location.search).get('slide') ?? 1) - 1));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const next = step(index, e.key);
      if (next >= SLIDES.length) location.assign('/control');
      else setIndex(next);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index]);
  useEffect(() => { history.replaceState(null, '', `/talk?slide=${index + 1}`); }, [index]);
  return index;
}

export function Talk() {
  const index = useSlideIndex();
  const Current = SLIDES[index]!;
  return <Stage><Current key={index} /></Stage>;
}
