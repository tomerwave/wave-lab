import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { agentEnvironment, type ShowConfig } from './config.js';
import { writeLine } from './output.js';

const AGENT_DIR = fileURLToPath(new URL('../agent/', import.meta.url));
const COMMANDS: Record<string, string[]> = {
  local: ['run', '--project', AGENT_DIR, 'python', `${AGENT_DIR}local_agent.py`],
  agentcore: ['run', '--project', AGENT_DIR, 'python', `${AGENT_DIR}harness.py`, 'invoke'],
};

export class AgentLauncher {
  private child: ChildProcess | null = null;

  constructor(private readonly config: ShowConfig) {}

  launch(runtime: string, extraArgs: string[] = []): boolean {
    const args = COMMANDS[runtime];
    if (!args) return false;
    this.stop();
    const showUrl = runtime === 'local' ? `http://localhost:${this.config.port}` : this.config.publicUrl;
    this.child = spawn('uv', [...args, ...extraArgs], { cwd: AGENT_DIR, env: agentEnvironment(this.config, showUrl), stdio: ['ignore', 'pipe', 'pipe'] });
    this.child.stdout?.on('data', (d: Buffer) => writeLine(`[agent] ${d.toString().trimEnd()}`));
    this.child.stderr?.on('data', (d: Buffer) => writeLine(`[agent] ${d.toString().trimEnd()}`));
    this.child.on('exit', (code) => writeLine(`[agent] exited with ${code}`));
    return true;
  }

  stop(): void {
    this.child?.kill('SIGTERM');
    this.child = null;
  }
}
