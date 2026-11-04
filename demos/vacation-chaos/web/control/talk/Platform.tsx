import { Accent, CodeBlock, Dim, Heading, Slide, Str } from './Frame';

const SPLIT: Array<[string, string, boolean]> = [
  ['You declare', 'Model · prompt · tools · memory · limits', false],
  ['AgentCore runs', 'The think, act, observe loop, a microVM per session, the browser, memory, traces and logs', true],
  ['Your code is only', 'The tools it calls. Here: a small MCP server and a fake booking site.', false],
];

export function ConfigSlide() {
  return (
    <Slide page={7}>
      <Heading title="The whole agent is a config" lead="No agent code. One API call creates it. AgentCore runs it." />
      <div className="flex min-h-0 flex-1 gap-10">
        <div className="flex w-[440px] shrink-0 flex-col gap-3.5">
          {SPLIT.map(([label, text, dark]) => (
            <div key={label} className={`flex flex-col gap-2 rounded-[14px] px-5 py-4 ${dark ? 'bg-zinc-900 text-zinc-50' : 'border border-zinc-200 bg-white'}`}>
              <span className={`text-sm font-semibold ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</span><span className="text-[19px] leading-snug">{text}</span>
            </div>
          ))}
        </div>
        <CodeBlock size="text-[15px]">
          <Dim>create_harness(</Dim>{'\n'}
          {'  '}harnessName=<Str>"vacation_chaos"</Str>,{'\n'}
          {'  '}model={'{'}<Str>"modelId"</Str>: <Str>"claude-haiku-4-5"</Str>{'}'},{'\n'}
          {'  '}systemPrompt=[{'{'}<Str>"text"</Str>: PROMPT{'}'}],{'\n'}
          {'  '}tools=[AGENTCORE_BROWSER],{'\n'}
          {'  '}memory={'{'}<Str>"strategies"</Str>: [<Str>"USER_PREFERENCE"</Str>]{'}'},{'\n'}
          {'  '}maxIterations=<Accent>120</Accent>,{'\n'}
          {'  '}maxTokens=<Accent>40_000</Accent>,{'\n'}
          {'  '}timeoutSeconds=<Accent>1800</Accent>,{'\n'}
          <Dim>)</Dim>{'\n'}
          <Dim>invoke_harness(</Dim>{'\n'}
          {'  '}messages=[MISSION],{'\n'}
          {'  '}tools=[SHOW_MCP_SERVER],{'\n'}
          {'  '}actorId=<Str>"tomer"</Str>,{'\n'}
          <Dim>)</Dim>
        </CodeBlock>
      </div>
    </Slide>
  );
}

const ROWS: Array<[string, string, string]> = [
  ['You ship', 'A config', 'Your agent code in a container'],
  ['The loop', 'AgentCore runs it, on Strands', 'You write it, any framework'],
  ['Swap the model', 'Per call, no redeploy', 'Change code, redeploy'],
  ['Built in', 'Browser, MCP tools, memory, traces', 'The same, wired up by you'],
  ['Best for', 'One agent, some tools, a goal', 'Graphs, workflows, custom hooks'],
  ['Watch out', 'Limits bite. My first run died at 80 steps fighting an insurance checkbox.', 'You own the loop, so you own its bugs'],
];

export function RuntimeSlide() {
  return (
    <Slide page={8}>
      <Heading title="AgentCore Harness or AgentCore Runtime?" lead="Two ways to run an agent on Amazon Bedrock AgentCore. Same infrastructure, different amount of code." />
      <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-[220px_1fr_1fr] bg-zinc-100 px-7 py-3.5 text-[15px] font-semibold text-zinc-600"><span /><span className="text-zinc-950">AgentCore Harness · managed</span><span>AgentCore Runtime · bring your code</span></div>
        {ROWS.map(([name, harness, runtime]) => (
          <div key={name} className="grid grid-cols-[220px_1fr_1fr] border-t border-zinc-100 px-7 py-3 text-lg leading-snug">
            <span className="text-zinc-500">{name}</span><span className="pr-6 font-medium">{harness}</span><span className="text-zinc-600">{runtime}</span>
          </div>
        ))}
      </div>
      <p className="text-[21px] font-medium">Start with AgentCore Harness. Drop to AgentCore Runtime when config is not enough.</p>
    </Slide>
  );
}
