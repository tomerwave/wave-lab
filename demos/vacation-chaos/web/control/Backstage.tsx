import { useEffect, useState, type ReactNode } from 'react';
import { act, start } from './presenter';
import { meta } from './show';

function Action({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mb-1.5 mr-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-100">{children}</button>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <><h4 className="mb-2 mt-3.5 text-xs font-semibold text-zinc-500">{title}</h4>{children}</>;
}

export function Backstage() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const toggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !(e.target instanceof HTMLInputElement)) setOpen((o) => !o);
    };
    document.addEventListener('keydown', toggle);
    return () => document.removeEventListener('keydown', toggle);
  }, []);
  if (!open) return null;
  const run = (action: string, body?: Record<string, unknown>) => () => void act(action, body);
  return (
    <div className="fixed bottom-5 right-5 z-20 max-h-[86vh] w-96 overflow-auto rounded-xl border border-zinc-200 bg-white p-4 text-[13px] shadow-xl">
      <p className="text-xs font-medium text-zinc-500">Backstage · press P to hide</p>
      <Group title="Run">
        <Action onClick={() => void start(meta.defaultRuntime)}>Start</Action>
        <Action onClick={run('start-live', { runtime: 'local' })}>Start on this laptop</Action>
        <Action onClick={run('start-replay')}>Scripted replay</Action>
        <Action onClick={run('turbo')}>Turbo finale</Action>
        <Action onClick={run('reset')}>Stop and go back to the lobby</Action>
      </Group>
      <Group title="Pace"><Action onClick={run('pace', { pace: 'story' })}>Storytelling</Action><Action onClick={run('pace', { pace: 'turbo' })}>Turbo</Action></Group>
      <Group title="Crowd"><Action onClick={run('pause')}>Pause</Action><Action onClick={run('resume')}>Resume</Action><Action onClick={run('vote')}>Open a vote</Action><Action onClick={run('close-vote')}>Close vote now</Action><Action onClick={run('extend-vote')}>Extend 15s</Action></Group>
      <Group title="Fire a twist now">{meta.twists.map((t) => <Action key={t.id} onClick={run('twist', { id: t.id })}>{t.label}</Action>)}</Group>
    </div>
  );
}
