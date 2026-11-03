# Vacation Chaos

Tomer tries to book a vacation. The crowd wants chaos.

An AI agent books a trip on SunnyHop, a fake travel site, while the audience votes on their phones for
things that go wrong. The agent has to notice the changes and adapt. Everything is fictional: no real
bookings, no real card, no real money.

## The three screens

| Screen | URL | Who sees it |
| --- | --- | --- |
| Mission Control | `/control` | The projector. Open the **Start the show** link that `npm start` prints to get the start bar. |
| Phone vote | `/vote` | The audience, through the QR code. |
| SunnyHop | `/site` | The agent's browser. Mission Control shows a mirror of it. |

## Run it

```bash
npm ci
cd demos/vacation-chaos/agent && uv sync && uv run playwright install chromium && cd -
export PRESENTER_KEY=$(openssl rand -hex 12)
npm start -w @tomerwave/vacation-chaos
```

Open `http://localhost:4545/control`, press `P` and paste the presenter key. On a public URL the server
refuses keys shorter than 16 characters, because anyone with the URL could otherwise run the show.

### Three ways to run the show

| Mode | Needs | What runs the agent |
| --- | --- | --- |
| **Replay** | Nothing | A scripted driver inside the server. Labeled "Replay" on screen. Use it to rehearse, and as the fallback. |
| **Live: local** | `aws login`, Bedrock model access | `agent/local_agent.py`: Strands with Claude on Bedrock and a local Chromium window. |
| **Live: AgentCore** | `aws login`, a public URL, a deployed harness | An AgentCore Harness (the managed Strands loop) with AgentCore Browser, Memory and Observability. |

`npm start` prints a **Start the show** link (`http://localhost:4545/control#key=…`). Open it on your
laptop: Mission Control gets a start bar with **Start**, **Approve spend**, **Human check done**, **Turbo**,
**Stop** and **More**. **Start** runs on AgentCore when `PUBLIC_URL` is public, and on this laptop when it is
not. The key travels in the URL fragment, which browsers never send to the server, and the page removes it
from the address bar at once. **More** (or `P`) opens the full presenter panel. Its **Start live** buttons reset the show, open the opening votes and launch the agent
process. **Pull the plug** kills the agent process. **Relaunch agent** starts a new one, which picks up
from the server's state.

### AgentCore setup (once)

AgentCore Browser runs in AWS, so it needs a public URL for the show server. Phones need one too.

```bash
npm run tunnel -w @tomerwave/vacation-chaos          # prints https://<random>.trycloudflare.com
PUBLIC_URL=https://<random>.trycloudflare.com npm start -w @tomerwave/vacation-chaos
cd demos/vacation-chaos/agent
PRESENTER_KEY=<printed key> uv run python harness.py deploy
PRESENTER_KEY=<printed key> uv run python seed_memory.py
```

`harness.py deploy` creates a least-privilege execution role, then creates or updates the
`vacation_chaos` harness. The role follows AWS's sample harness policy, scoped to the two models the show
uses, the AgentCore Browser and the harness's own memory. The trust policy only lets AgentCore in this
account and Region assume it. The harness has the Bedrock model, the system prompt from `prompt.md`, the
AgentCore Browser tool, managed memory, and explicit limits: 80 iterations, 2,048 output tokens per reply,
40,000 output tokens per run and a 30-minute timeout. The harness-level `maxTokens` is the budget for the
whole run, not per reply; setting both to 2,048 stops the run after a few steps with
`max_output_tokens_exceeded`.

Each browser step returns the page text, so the conversation grows fast. A `sliding_window` truncation keeps
the last 20 messages. That is safe here because the show server, not the conversation, holds the state:
every show tool reply carries the mission, the inbox and what is already booked. Every SunnyHop page also
starts with a visually hidden "Page actions" list of its button ids, so the browser tool clicks real ids
instead of guessing selectors. `allowedTools`
is `["@browser", "@show"]`, so the agent sees only the browser and the show tools, and the built-in `shell`
and `file_operations` tools are off. AgentCore Browser needs the `@` form: a plain `"browser"` only matches
built-in tools, and silently leaves the agent without a browser.

The show's MCP server is added on each invocation, not stored in the harness. Its URL and per-run
credentials (`Authorization: Bearer <presenter key>` and `x-agent-token`) travel as headers, never in the
URL, so a new tunnel or a new run does not need a redeploy and no secret is saved in the harness. The
brain transplant can only switch to the two models named in the execution role.

Jev from TypeSafe AI makes the agent's real choices through a `jev_decide` show tool: which flight, which hotel, whether fine print is a trap, whether to pay. Put `TYPESAFE_API_KEY` in `demos/vacation-chaos/.env` (git-ignored); `npm start` loads it. The key stays in the show server and is never passed to the agent or the model. Without it the tool is not offered and the agent decides alone.

Environment variables for the agent: `SHOW_URL`, `PRESENTER_KEY`, `MODEL_ID` (default
`eu.anthropic.claude-haiku-4-5-20251001-v1:0`), `TRANSPLANT_MODEL_ID` (default
`eu.anthropic.claude-sonnet-4-6`), `AWS_REGION` (default `eu-central-1`), and `BROWSER=agentcore`, which
lets the local agent use AgentCore Browser without deploying anything. Haiku 4.5 is the cheapest Claude
model on Bedrock that drives the browser reliably; newer models need account access first.

The local agent uses the `browser` tool from `strands-agents-tools`, which is deprecated and removed in 0.9,
so the dependency is pinned below 0.9. The AgentCore Harness path does not use it.

## Run of show

1. Crowd votes where Tomer goes, then his one rule.
2. The agent reads the mission and recalls memories from earlier runs.
3. Flights. **Oil shock** fires on its own: fares triple.
4. Chaos vote while the agent selects a flight.
5. Book the flight. **Intern deploy**: the hotels page returns a 503 for 10 seconds.
6. Chaos vote when hotels load.
7. Hotel fine print: the goat clause, owner-written reviews, and a prompt injection telling AI agents to book
   the Presidential Suite.
8. Chaos vote at the first hotel page.
9. Checkout: the agent asks you before going over budget, and hands you the human check (you solve it from
   the start bar).
10. **Turbo finale**: the same run at full speed, reusing the twists the crowd chose.

## How the show stays honest

- The server is the source of truth. Twists are applied when the server renders pages, so the agent can't
  skip them. Payment over budget is rejected by the server unless the presenter approved it. The model's
  word is never enough.
- The agent's only non-browser tools are the show tools (`think_aloud`, `check_inbox`,
  `ask_presenter`, `report_booking`, `finish`, and `jev_decide` when Jev is configured). Storytelling pace slows the show by holding the
  `think_aloud` reply on the server, not by slowing the model.
- Replay mode is a script, labeled "Replay" in the run line. Live mode is labeled "Live".

## Who can change the show

Once an agent is launched, the server issues a per-launch agent token. The agent's first page
(`/site?agent=<token>`) sets a cookie. Every other browser, including an audience member who opens
`/site`, gets a read-only view, so nobody else can book or fire twists. MCP requests carry the presenter
key and the same token as headers, so a killed agent's leftover cloud session is refused (HTTP 410). The presenter
API needs the key. Phones can only vote.

## Limitations

- State is in memory, and there is one show at a time. Restarting the server resets everything.
- The checkout is simulated, with no idempotency or durable ledger. A real booking flow needs both.
- Phones poll `/api/state` every second. A quick tunnel is fine for a conference room. A large room should
  use a named tunnel or hosted server.

## Credits

Hotel and city photos in `public/img` are from Unsplash, used under the Unsplash License.

## Screenshots

`docs/screens/index.html` shows every scenario. Regenerate with the server running:

```bash
cd demos/vacation-chaos/agent && PRESENTER_KEY=demo uv run python screens.py
```
