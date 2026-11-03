import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    show_url: str
    presenter_key: str
    model_id: str
    region: str
    browser: str
    harness_name: str
    role_name: str


def load() -> Settings:
    key = os.environ.get("PRESENTER_KEY")
    if not key:
        raise SystemExit("Set PRESENTER_KEY to the key the show server printed.")
    return Settings(
        show_url=os.environ.get("SHOW_URL", "http://localhost:4545").rstrip("/"),
        presenter_key=key,
        model_id=os.environ.get("MODEL_ID", "us.anthropic.claude-sonnet-4-6"),
        region=os.environ.get("AWS_REGION", "us-east-1"),
        browser=os.environ.get("BROWSER", "local"),
        harness_name=os.environ.get("HARNESS_NAME", "vacation_chaos"),
        role_name=os.environ.get("HARNESS_ROLE", "VacationChaosHarnessRole"),
    )
