const head = (title: string, css: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="/static/theme.css"><link rel="stylesheet" href="/static/${css}"></head>`;

export interface ControlMeta { checkpoints: readonly { label: string; kind: string }[]; twists: { id: string; label: string }[]; voteUrl: string }

const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export function controlPage(meta: ControlMeta): string {
  return `${head('Mission Control', 'control.css')}<body>
<script id="meta" type="application/json">${json(meta)}</script>
<div class="top"><div><div class="eyebrow">WaveLab · Mission Control</div><h1>Book Tomer a vacation. Do not get fired.</h1></div><div class="runline" id="runline"></div></div>
<div class="rail" id="rail"></div>
<div class="main">
  <div class="col">
    <div class="block"><span class="label">Budget left</span><div class="big" id="budget"></div><div class="sub" id="budgetSub"></div></div>
    <div class="block"><span class="label">Mission</span><div id="mission"></div></div>
    <div class="block"><span class="label">Booked</span><div id="booked"></div></div>
    <div class="block"><span class="label">Memory</span><div id="memory" class="small muted">Nothing recalled yet</div></div>
  </div>
  <div class="col center">
    <div class="frame"><div class="bar"><span>&#9679;&#9679;&#9679;</span><span class="u" id="url">sunnyhop.demo</span><span id="browserLabel">Browser</span></div>
      <div class="screen"><iframe id="mirror" title="Agent browser mirror" src="/site?mirror=1"></iframe>
        <div class="ghost" id="ghost"></div>
        <div class="votecard hidden" id="votecard"><div class="vq" id="voteQ"></div><div id="voteBig"></div>
          <div class="vfoot"><img src="/qr.svg" alt="QR code to vote" class="qr"><div><div class="label">Vote now</div><div class="url" id="voteUrl"></div><div class="count" id="voteCount"></div></div></div></div>
        <div class="toast hidden" id="toast"><div class="label">Plot twist</div><div class="tt" id="toastTitle"></div><div id="toastText"></div></div>
      </div></div>
    <div class="cap"><span id="click">Mirror of the agent's browser</span><span id="stepNo"></span></div>
  </div>
  <div class="col">
    <div class="block"><span class="label">Thinking</span><div class="thought" id="thought">Waiting for the mission.</div></div>
    <div class="steps" id="steps"></div>
    <div class="ask hidden" id="ask"><span class="label">The agent asks you</span><div id="askText"></div></div>
    <div class="vote" id="vote"></div>
  </div>
</div>
<div class="tele" id="tele"></div>
<div class="overlay hidden" id="overlay"></div>
<script src="/static/control.js" defer></script><script src="/static/presenter.js" defer></script></body></html>`;
}

export function votePage(): string {
  return `${head('Vote · Vacation Chaos', 'vote.css')}<body>
<main><div class="eyebrow">WaveLab · Vacation Chaos</div><h1 id="q">Waiting for the next vote</h1>
<p class="sub" id="sub">Keep this page open. When a vote opens, it shows up here.</p>
<div id="options"></div><p class="sub" id="status"></p></main>
<script src="/static/vote.js" defer></script></body></html>`;
}
