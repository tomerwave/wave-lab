import json
import urllib.request
from pathlib import Path

from mcp.client.streamable_http import streamable_http_client
from strands import Agent
from strands.hooks import AfterModelCallEvent
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient
from strands_tools.browser import AgentCoreBrowser, LocalChromiumBrowser

import config
from output import say

PROMPT = (Path(__file__).parent / "prompt.md").read_text()


class Telemetry:
    def __init__(self, settings: config.Settings) -> None:
        self.settings = settings
        self.sent = {"inputTokens": 0, "outputTokens": 0, "latencyMs": 0}

    def post(self, payload: dict) -> None:
        request = urllib.request.Request(
            f"{self.settings.show_url}/api/telemetry",
            data=json.dumps(payload).encode(),
            headers={"content-type": "application/json", "x-presenter-key": self.settings.presenter_key},
            method="POST",
        )
        try:
            urllib.request.urlopen(request, timeout=5).close()
        except OSError as error:
            say(f"Telemetry skipped: {error}")

    def after_model(self, event: AfterModelCallEvent) -> None:
        metrics = event.agent.event_loop_metrics
        totals = {**metrics.accumulated_usage, **metrics.accumulated_metrics}
        delta = {k: int(totals.get(k, 0)) - v for k, v in self.sent.items()}
        self.sent = {k: int(totals.get(k, 0)) for k in self.sent}
        self.post({**delta, "model": self.settings.model_id})


def build_browser(settings: config.Settings):
    if settings.browser == "agentcore":
        return AgentCoreBrowser(region=settings.region)
    return LocalChromiumBrowser()


def main() -> None:
    settings = config.load()
    telemetry = Telemetry(settings)
    show_tools = MCPClient(lambda: streamable_http_client(settings.mcp_url))
    model = BedrockModel(model_id=settings.model_id, region_name=settings.region, max_tokens=2048)
    browser = build_browser(settings)
    with show_tools:
        agent = Agent(model=model, system_prompt=PROMPT, tools=[browser.browser, *show_tools.list_tools_sync()])
        agent.hooks.add_callback(AfterModelCallEvent, telemetry.after_model)
        result = agent(settings.start_message)
    say(str(result))


if __name__ == "__main__":
    main()
