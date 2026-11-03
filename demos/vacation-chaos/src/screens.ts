const head = (title: string, css: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="/static/theme.css"><link rel="stylesheet" href="/static/${css}"></head>`;

export interface ControlMeta { goat: string; goatCells: number[]; twists: { id: string; label: string }[]; voteUrl: string; defaultRuntime: string }

const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

const LOGO = '<img src="/static/img/tomerwave-icon.svg" class="logo" alt="TomerWave">';

export function controlPage(meta: ControlMeta): string {
  return `${head('Mission Control', 'control.css')}<body>
<script id="meta" type="application/json">${json(meta)}</script>
<header class="top"><div class="title">${LOGO}<div><h1>Vacation Chaos</h1><p class="muted">The crowd books Tomer a vacation. An AI agent does the clicking.</p></div></div><div class="status" id="status"></div></header>
<div class="main">
  <section class="card browser">
    <div class="bar"><span class="dots"><i></i><i></i><i></i></span><span class="u" id="url">sunnyhop.demo</span><span class="badge">The agent's browser</span></div>
    <div class="screen" id="screen"><iframe id="mirror" title="Agent browser mirror" src="/site?mirror=1"></iframe><div class="ghost" id="ghost"></div></div>
  </section>
  <aside class="col">
    <section class="card pad"><span class="label">The agent is thinking</span><div class="thought" id="thought">Waiting for the mission.</div></section>
    <section class="card pad"><span class="label">Budget left</span><div class="big" id="budget"></div><div class="sub" id="budgetSub"></div><div class="meter"><i id="meter"></i></div><div class="mission" id="mission"></div></section>
    <section class="card pad"><span class="label">Booked</span><div id="booked"></div></section>
    <section class="card pad grow"><span class="label">Activity</span><div class="steps" id="steps"></div></section>
    <section class="card pad" id="lastVote"></section>
  </aside>
</div>
<footer class="tele" id="tele"></footer>
<div class="stage hidden" id="stage"></div>
<div class="card overlay hidden" id="overlay"></div>
<script src="/static/presenter.js" defer></script><script src="/static/control.js" defer></script></body></html>`;
}

export function votePage(): string {
  return `${head('Vote · Vacation Chaos', 'vote.css')}<body>
<header class="top"><img src="/static/img/tomerwave-icon.svg" alt="TomerWave" class="me"><div><b>Vacation Chaos</b><span>Tomer's live agent demo</span></div><span class="live" id="live">Live</span></header>
<main>
  <section class="card votebox"><div class="meta"><span id="kicker">Crowd vote</span><span id="timer"></span></div><div class="timebar"><i id="timebar"></i></div>
    <h1 id="q">Waiting for the next vote</h1><p class="sub" id="sub">Keep this page open. When a vote opens, it shows up here.</p><div id="options"></div><p class="status" id="status"></p></section>
  <section class="card now"><span class="label">The agent right now</span><p id="thought">Waiting for the mission.</p></section>
</main>
<footer>Built with Strands Agents and Amazon Bedrock AgentCore</footer>
<script src="/static/vote.js" defer></script></body></html>`;
}
