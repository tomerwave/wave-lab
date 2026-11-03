import type { ReactNode } from 'react';
import { Arrow, Box, Chrome, Heading, Slide } from './Frame';

function DiagramTitle({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      <h2 className="absolute left-20 top-[104px] text-[56px] font-semibold leading-[60px] tracking-[-0.04em]">{title}</h2>
      <p className="absolute left-20 top-[176px] text-[22px] text-zinc-600">{lead}</p>
    </>
  );
}

const Sub = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => <span className={`text-base ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{children}</span>;

export function AgentSlide() {
  return (
    <div className="absolute inset-0 animate-rise text-lg">
      <Arrow x={280} y={304} length={119} dir="right" />
      <Arrow x={620} y={304} length={250} dir="right" head={false} dark />
      <Arrow x={870} y={304} length={95} dir="down" dark />
      <Arrow x={870} y={488} length={96} dir="down" head={false} dark />
      <Arrow x={621} y={584} length={249} dir="left" dark />
      <Arrow x={510} y={349} length={191} dir="up" dark />
      <Arrow x={980} y={444} length={79} dir="right" />
      <Chrome page={4} />
      <DiagramTitle title="What is an agent?" lead="A model in a loop, with tools, until the job is done." />
      <Box x={80} y={264} w={200} h={80}><b className="font-semibold">A goal</b><br /><Sub>book the trip</Sub></Box>
      <Box x={400} y={260} w={220} h={88} dark><b className="font-semibold">Think</b><br /><Sub dark>the model picks a step</Sub></Box>
      <Box x={760} y={400} w={220} h={88} dark><b className="font-semibold">Act</b><br /><Sub dark>it calls a tool</Sub></Box>
      <Box x={400} y={540} w={220} h={88} dark><b className="font-semibold">Observe</b><br /><Sub dark>it reads the result</Sub></Box>
      <Box x={1060} y={404} w={140} h={80}><b className="font-semibold">Done</b><br /><Sub>or out of steps</Sub></Box>
      <span className="absolute left-[610px] top-[432px] w-40 text-center text-[15px] text-zinc-500">repeat</span>
    </div>
  );
}

const PIECES: Array<[string, number, number]> = [['The loop', 130, 300], ['Tool calling', 360, 300], ['Context', 590, 300], ['Memory', 130, 568], ['Limits', 360, 568], ['A sandbox', 590, 568]];

export function HarnessSlide() {
  return (
    <div className="absolute inset-0 animate-rise text-lg">
      <div className="absolute left-20 top-[240px] h-[420px] w-[760px] rounded-[22px] bg-zinc-900" />
      <span className="absolute left-28 top-[262px] text-sm font-semibold text-zinc-400">The harness</span>
      {PIECES.map(([label, x, y]) => <span key={label} className="absolute flex h-[52px] w-[200px] items-center justify-center rounded-xl bg-zinc-800 text-[17px] text-zinc-50" style={{ left: x, top: y }}>{label}</span>)}
      <div className="absolute left-[310px] top-[392px] flex h-[136px] w-[300px] flex-col items-center justify-center rounded-2xl bg-white"><b className="text-[26px] font-semibold">The model</b><span className="text-[17px] text-zinc-500">reads text, writes text</span></div>
      <Chrome page={5} />
      <DiagramTitle title="What is a harness?" lead="Everything around the model that turns it into an agent." />
      <div className="absolute left-[900px] top-[260px] flex w-[300px] flex-col gap-5 text-[21px]">
        <span><b className="font-semibold">Model</b> <span className="text-zinc-600">= the brain</span></span>
        <span><b className="font-semibold">Harness</b> <span className="text-zinc-600">= everything around it</span></span>
        <b className="font-semibold">Model + harness = agent</b>
        <span className="mt-6 text-lg leading-relaxed text-zinc-600">You already use one. Claude Code and Cursor are a model inside a harness.</span>
      </div>
    </div>
  );
}

interface Option { tag: string; title: string; text: string; owns: Array<[string, string]>; dark?: boolean }

const OPTIONS: Option[] = [
  { tag: 'Do it yourself', title: 'Your loop, your servers', text: 'LangGraph, Strands or plain code, on your own containers.', owns: [['You own', 'everything: loop, scaling, sandboxing, memory, tracing']] },
  { tag: 'AgentCore Runtime · bring your code', title: 'Your loop, AWS hosts it', text: 'Ship your agent code as a container. Any framework.', owns: [['You own', 'the loop and the code'], ['AWS runs', 'microVMs, scaling, identity, tracing']] },
  { tag: 'AgentCore Harness · managed · today', title: 'No loop code at all', text: 'Declare the agent as config. AWS runs the loop for you.', owns: [['You own', 'the config and your tools'], ['AWS runs', 'the loop, plus all of Runtime']], dark: true },
];

function OptionCard({ option: o }: { option: Option }) {
  return (
    <div className={`flex flex-col gap-3.5 rounded-2xl p-6 ${o.dark ? 'bg-zinc-900 text-zinc-50' : 'border border-zinc-200 bg-white'}`}>
      <span className={`text-sm ${o.dark ? 'text-zinc-400' : 'text-zinc-500'}`}>{o.tag}</span>
      <span className="text-[26px] font-semibold tracking-[-0.02em]">{o.title}</span>
      <span className={`text-[17px] leading-relaxed ${o.dark ? 'text-zinc-300' : 'text-zinc-600'}`}>{o.text}</span>
      <div className={`mt-auto flex flex-col gap-1.5 border-t pt-3.5 text-base ${o.dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
        {o.owns.map(([who, what]) => <span key={who}><b className="font-semibold">{who}</b> <span className={o.dark ? 'text-zinc-300' : 'text-zinc-600'}>{what}</span></span>)}
      </div>
    </div>
  );
}

export function OptionsSlide() {
  return (
    <Slide page={6}>
      <Heading title="Three ways to run an agent" lead="The question is how much of the harness you want to own. AgentCore offers the last two." />
      <div className="grid flex-1 grid-cols-3 gap-[18px]">{OPTIONS.map((o) => <OptionCard key={o.tag} option={o} />)}</div>
      <div className="flex justify-between text-base text-zinc-500"><span>More control</span><span>Less code</span></div>
    </Slide>
  );
}
