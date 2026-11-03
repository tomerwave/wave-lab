import json
import urllib.request

import config
from output import say


def call(settings: config.Settings, path: str, body: dict) -> dict:
    request = urllib.request.Request(
        f"{settings.show_url}{path}", data=json.dumps(body).encode(), method="POST",
        headers={"content-type": "application/json", "x-presenter-key": settings.presenter_key},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read() or b"{}")


def post_telemetry(settings: config.Settings, payload: dict) -> None:
    try:
        call(settings, "/api/telemetry", payload)
    except OSError as error:
        say(f"Telemetry skipped: {error}")
