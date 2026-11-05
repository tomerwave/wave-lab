import { LOGO, SOCIALS } from './contact.js';

const head = (title: string, css: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="/static/theme.css"><link rel="stylesheet" href="/static/${css}"></head>`;

export interface ControlMeta { goat: string; goatCells: number[]; twists: { id: string; label: string }[]; voteUrl: string; defaultRuntime: string }

const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export function controlPage(meta: ControlMeta): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Mission Control</title>
<link rel="stylesheet" href="/app/control.css"><script type="module" src="/app/control.js"></script></head>
<body><script id="meta" type="application/json">${json(meta)}</script><div id="root"></div></body></html>`;
}

function contactCard(): string {
  const icons = SOCIALS.map((s) => `<a href="${s.href}" target="_blank" rel="noopener" aria-label="${s.label}" title="${s.label}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg></a>`).join('');
  return `<section class="card by"><img src="${LOGO}" alt="TomerWave"><b>Tomer Gal</b><nav class="socials">${icons}</nav></section>`;
}

export function votePage(): string {
  return `${head('Vote · Vacation Chaos', 'vote.css')}<body>
<header class="top"><img src="${LOGO}" alt="TomerWave" class="me"><div><b>Vacation Chaos</b><span>Tomer's live agent demo</span></div><span class="live" id="live">Live</span></header>
<main>
  <section class="card votebox"><div class="meta"><span id="kicker">Crowd vote</span><span id="timer"></span></div><div class="timebar"><i id="timebar"></i></div>
    <h1 id="q">Waiting for the next vote</h1><p class="sub" id="sub">Keep this page open. When a vote opens, it shows up here.</p><div id="options"></div><p class="status" id="status"></p></section>
  <section class="card now"><span class="label">The agent right now</span><p id="thought">Waiting for the mission.</p></section>
  ${contactCard()}
</main>
<footer>Built with Strands Agents and Amazon Bedrock AgentCore</footer>
<script src="/static/vote.js" defer></script></body></html>`;
}
