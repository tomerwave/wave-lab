import uuid
from datetime import datetime, timezone

import boto3

import config
from harness import ACTOR, find_harness
from output import say

PAST_RUN = [
    ("USER", "Book me a trip, but never a red-eye flight again. Last time I slept on the tray table."),
    ("ASSISTANT", "Noted: no red-eye flights for Tomer."),
    ("USER", "Also, last year an agent booked me a hostel by mistake. Twelve bunk beds. Never again."),
    ("ASSISTANT", "Noted: Tomer does not want hostels."),
]


def memory_id(settings: config.Settings) -> str:
    control = boto3.client("bedrock-agentcore-control", region_name=settings.region)
    summary = find_harness(control, settings.harness_name)
    if not summary:
        raise SystemExit("Deploy the harness first: harness.py deploy")
    harness = control.get_harness(harnessId=summary["harnessId"])["harness"]
    arn = harness["memory"]["managedMemoryConfiguration"]["arn"]
    return arn.split("/")[-1]


def main() -> None:
    settings = config.load()
    data = boto3.client("bedrock-agentcore", region_name=settings.region)
    memory = memory_id(settings)
    session = f"seed-{uuid.uuid4()}"
    for role, text in PAST_RUN:
        data.create_event(
            memoryId=memory, actorId=ACTOR, sessionId=session, eventTimestamp=datetime.now(timezone.utc),
            payload=[{"conversational": {"content": {"text": text}, "role": role}}],
        )
    say(f"Seeded {len(PAST_RUN)} events into {memory} for actor {ACTOR}. Long-term extraction takes about a minute.")


if __name__ == "__main__":
    main()
