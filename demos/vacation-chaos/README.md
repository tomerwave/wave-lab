# Vacation Chaos

Tomer tries to book a vacation. The crowd wants chaos.

An AI agent books a trip on SunnyHop, a fake travel site, while the audience votes on their phones for
things that go wrong. The agent has to notice the changes and adapt. Everything is fictional: no real
bookings, no real card, no real money.

## The three screens

| Screen | URL | Who sees it |
| --- | --- | --- |
| Mission Control | `/control` | The projector. Press `P` to open the presenter panel. |
| Phone vote | `/vote` | The audience, through the QR code. |
| SunnyHop | `/site` | The agent's browser. Mission Control shows a mirror of it. |

## Run it

```bash
npm ci
cd demos/vacation-chaos/agent && uv sync && uv run playwright install chromium && cd -
PRESENTER_KEY=demo npm start -w @tomerwave/vacation-chaos
```

Open `http://localhost:4545/control` and press `P`. The presenter key is `demo`.

### Three ways to run the show

| Mode | Needs | What runs the agent |
| --- | --- | --- |
| **Replay** | Nothing | A scripted driver inside the server. Labeled "Replay" on screen. Use it to rehearse, and as the fallback. |
| **Live: local** | `aws login`, Bedrock model access | `agent/local_agent.py`: Strands with Claude on Bedrock and a local Chromium window. |
| **Live: AgentCore** | `aws login`, a public URL, a deployed harness | An AgentCore Harness (the managed Strands loop) with AgentCore Browser, Memory and Observability. |

The presenter panel's **Start live** buttons reset the show, open the opening votes and launch the agent
process. **Pull the plug** kills the agent process. **Relaunch agent** starts a new one, which picks up
from the server's state.

### AgentCore setup (once)

AgentCore Browser runs in AWS, so it needs a public URL for the show server. Phones need one too.

```bash
npm run tunnel -w @tomerwave/vacation-chaos          # prints https://<random>.trycloudflare.com
PUBLIC_URL=https://<random>.trycloudflare.com PRESENTER_KEY=demo npm start -w @tomerwave/vacation-chaos
cd demos/vacation-chaos/agent
SHOW_URL=https://<random>.trycloudflare.com PRESENTER_KEY=demo uv run python harness.py deploy
SHOW_URL=https://<random>.trycloudflare.com PRESENTER_KEY=demo uv run python seed_memory.py
```

`harness.py deploy` creates a least-privilege execution role, then creates or updates the
`vacation_chaos` harness. The harness has the Bedrock model, the system prompt from `prompt.md`, the
AgentCore Browser tool, the show's MCP tools as a remote MCP server, managed memory, and explicit
iteration, token and timeout limits. The tunnel URL changes on every run, so re-run `deploy` after
starting a new tunnel.

Environment variables for the agent: `SHOW_URL`, `PRESENTER_KEY`, `MODEL_ID` (default
`us.anthropic.claude-sonnet-4-6`), `AWS_REGION` (default `us-east-1`), and `BROWSER=agentcore`, which lets
the local agent use AgentCore Browser without deploying anything.

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
   the presenter panel).
10. **Turbo finale**: the same run at full speed, reusing the twists the crowd chose.

## How the show stays honest

- The server is the source of truth. Twists are applied when the server renders pages, so the agent can't
  skip them. Payment over budget is rejected by the server unless the presenter approved it. The model's
  word is never enough.
- The agent's only non-browser tools are the five show tools (`think_aloud`, `check_inbox`,
  `ask_presenter`, `report_booking`, `finish`). Storytelling pace slows the show by holding the
  `think_aloud` reply on the server, not by slowing the model.
- Replay mode is a script, labeled "Replay" in the run line. Live mode is labeled "Live".

## Limitations

- State is in memory, and there is one show at a time. Restarting the server resets everything.
- The checkout is simulated, with no idempotency or durable ledger. A real booking flow needs both.
- Phones poll `/api/state` every second. A quick tunnel is fine for a conference room. A large room should
  use a named tunnel or hosted server.
