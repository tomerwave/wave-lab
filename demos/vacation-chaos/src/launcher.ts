import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { agentEnvironment, type ShowConfig } from './config.js';
import { writeLine } from './output.js';
import type { Show } from './show/engine.js';

const AGENT_DIR = fileURLToPath(new URL('../agent/', import.meta.url));
const COMMANDS: Record<string, string[]> = {
  local: ['run', '--project', AGENT_DIR, 'python', `${AGENT_DIR}local_agent.py`],
  agentcore: ['run', '--project', AGENT_DIR, 'python', `${AGENT_DIR}harness.py`, 'invoke'],
};

export class AgentLauncher {
  private child: ChildProcess | null = null;

  constructor(private readonly config: ShowConfig) {}

  launch(show: Show, runtime: string, extraArgs: string[] = []): boolean {
    const args = COMMANDS[runtime];
    if (!args) return false;
    this.stop();
    const showUrl = runtime === 'local' ? `http://localhost:${this.config.port}` : this.config.publicUrl;
    const env = { ...agentEnvironment(this.config, showUrl), AGENT_TOKEN: show.issueAgentToken() };
    const child = spawn('uv', [...args, ...extraArgs], { cwd: AGENT_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
    this.child = child;
    child.stdout?.on('data', (d: Buffer) => writeLine(`[agent] ${d.toString().trimEnd()}`));
    child.stderr?.on('data', (d: Buffer) => writeLine(`[agent] ${d.toString().trimEnd()}`));
    child.on('exit', (code) => {
      writeLine(`[agent] exited with ${code}`);
      if (this.child === child) show.agentStopped('The agent stopped before it finished the booking.');
    });
    return true;
  }

  stop(): void {
    this.child?.kill('SIGTERM');
    this.child = null;
  }
}
