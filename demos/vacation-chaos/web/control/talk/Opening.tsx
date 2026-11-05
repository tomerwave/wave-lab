import type { ReactNode } from 'react';
import { Accent, CodeBlock, Dim, Heading, Slide } from './Frame';

export function TitleSlide() {
  return (
    <div className="absolute inset-0 flex animate-rise flex-col justify-between px-20 py-16">
      <div className="flex justify-between text-[15px]"><span className="font-semibold">Vacation Chaos</span><span className="text-zinc-500">Live on Amazon Bedrock AgentCore</span></div>
      <div className="flex max-w-[760px] flex-col gap-5">
        <h1 className="text-[84px] font-semibold leading-[0.98] tracking-[-0.045em]">An AI agent books my vacation.</h1>
        <p className="text-[40px] font-medium leading-tight tracking-[-0.03em] text-zinc-500">You make it chaotic.</p>
      </div>
      <div className="flex justify-between text-base text-zinc-500"><span><b className="font-semibold text-zinc-950">Tomer Gal</b> · tomerwave.com</span><span>5 November 2026</span></div>
    </div>
  );
}

const yaml: ReactNode = (
  <>
    <Accent>tomer_gal</Accent>:{'\n'}
    {'  '}<Dim>role</Dim>: Fractional CTO &amp; Tech Advisor{'\n'}
    {'  '}<Dim>based</Dim>: Rehovot{'\n'}
    {'  '}<Dim>now</Dim>:{'\n'}
    {'    '}- CTO at a stealth supply chain startup{'\n'}
    {'    '}- Consulting a stealth construction startup{'\n'}
    {'    '}- Helping founders decide what to build{'\n'}
    {'      '}and get it into production. Still writing code.{'\n'}
    {'  '}<Dim>focus</Dim>: [R&amp;D leadership, Architecture, AI agents, Automation]{'\n'}
    {'  '}<Dim>podcast</Dim>: בינה ושגרה{'\n'}
    {'  '}<Dim>before</Dim>:{'\n'}
    {'    '}- Tonkean: third developer, workflow automation{'\n'}
    {'    '}- LayerX: led engineers building browser security{'\n'}
    {'    '}- Fireblocks: staking and swapping services{'\n'}
    {'    '}- Stealth: AI agent monitoring and remediation{'\n'}
    {'    '}- Founded Butler AI and Lumos AI{'\n'}
    {'  '}<Dim>started_coding</Dim>: {'{'} age: 12, reason: fell in love with gaming {'}'}
  </>
);

export function WhoSlide() {
  return (
    <Slide page={2}>
      <div className="flex min-h-0 flex-1 gap-12">
        <div className="flex w-[380px] shrink-0 flex-col gap-4">
          <img src="/static/img/tomer.jpg" alt="Tomer Gal on a hike by a mountain lake" className="h-[440px] w-[380px] rounded-2xl object-cover object-[44%_30%]" />
          <div className="flex flex-col gap-1"><span className="text-3xl font-semibold tracking-[-0.03em]">Tomer Gal</span><span className="text-[17px] text-zinc-500">Fractional CTO and Tech Advisor · tomerwave.com</span></div>
        </div>
        <CodeBlock size="text-[15px]">{yaml}</CodeBlock>
      </div>
    </Slide>
  );
}

const STEPS: Array<[string, string, string]> = [
  ['01', 'A mission', 'Book Tomer five nights from Tel Aviv. $2,400. Do not get fired.'],
  ['02', 'You pick', 'Where he goes and his one rule. From your phone, right now.'],
  ['03', 'Chaos', 'Oil shocks, plot twists you vote on, dark patterns, and a CAPTCHA only a human can solve.'],
];

export function PlanSlide() {
  return (
    <Slide page={3}>
      <Heading title="The next 20 minutes" />
      <div className="grid grid-cols-4 gap-5">
        {STEPS.map(([n, title, text]) => (
          <div key={n} className="flex min-h-[300px] flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6">
            <span className="text-[15px] text-zinc-500 tabular-nums">{n}</span><span className="text-[26px] font-semibold tracking-[-0.02em]">{title}</span><span className="text-lg leading-relaxed text-zinc-600">{text}</span>
          </div>
        ))}
        <div className="flex min-h-[300px] flex-col gap-3 rounded-2xl bg-zinc-900 p-6 text-zinc-50">
          <span className="text-[15px] text-zinc-400 tabular-nums">04</span><span className="text-[26px] font-semibold tracking-[-0.02em]">It holds the line</span><span className="text-lg leading-relaxed text-zinc-300">Stays in budget, refuses bad deals, and asks a human when it should.</span>
        </div>
      </div>
      <p className="text-lg text-zinc-500">All prices fictional. All payments simulated. All suffering real.</p>
    </Slide>
  );
}
