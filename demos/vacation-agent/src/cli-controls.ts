import { createInterface } from 'node:readline';
import { writeLine } from './output.js';
import type { PresenterSession } from './session.js';

const HELP = 'Commands: next | run | pause | stop | reset | sold-out [hotel id] | restore-hotel [hotel id] | budget 500 | budget 600 | help. Default hotel: A. Mutations apply at the next checkpoint; next releases one checkpoint. Reset starts a new run in this browser.';

export function presenterCommand(session: PresenterSession, line: string): void {
  const [command, value] = line.trim().split(/\s+/);
  try {
    switch (command) {
      case 'next': session.next(); break;
      case 'run': session.resume(); break;
      case 'pause': session.pause(); break;
      case 'stop': session.stop(); break;
      case 'sold-out':
      case 'restore-hotel':
        session.queue({ kind: 'availability', hotelId: value ?? 'A', available: command === 'restore-hotel' });
        writeLine('Availability change queued.');
        break;
      case 'budget':
        session.queue({ kind: 'budget', value: Number(value) });
        writeLine('Budget change queued.');
        break;
      case 'help': writeLine(HELP); break;
      default: writeLine('Unknown command. ' + HELP);
    }
  } catch (error) { writeLine(error instanceof Error ? error.message : String(error)); }
}

export function startPresenterInput(presenter?: PresenterSession, onReset?: () => void) {
  if (!presenter) return undefined;
  const input = createInterface({ input: process.stdin });
  writeLine(`run ${presenter.id}: ${presenter.mode}. Paused before the first choice.`);
  presenterCommand(presenter, 'help');
  let previous = '';
  presenter.onChange = () => {
    const status = `presenter: ${presenter.status}, ${presenter.currentPhase}, choice ${presenter.currentChoice ?? 'none'}, world revision ${presenter.revision}`;
    if (status === previous) return;
    previous = status;
    writeLine(status);
  };
  input.on('line', line => {
    if (line.trim() === 'reset' && onReset) onReset();
    else presenterCommand(presenter, line);
  });
  const interrupt = () => presenter.stop();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  input.on('close', () => {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    presenter.stop();
  });
  return input;
}
