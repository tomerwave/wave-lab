import argparse
import json
import time
import urllib.request
import uuid
from pathlib import Path

import boto3

import config
from output import say

PROMPT = (Path(__file__).parent / "prompt.md").read_text()
ACTOR = "tomer"


def trust_policy(account: str, region: str) -> str:
    return json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "bedrock-agentcore.amazonaws.com"},
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {"aws:SourceAccount": account},
                "ArnLike": {"aws:SourceArn": f"arn:aws:bedrock-agentcore:{region}:{account}:*"},
            },
        }],
    })


def role_policy(account: str, region: str) -> str:
    return json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {"Effect": "Allow", "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
             "Resource": [f"arn:aws:bedrock:*:{account}:inference-profile/*", "arn:aws:bedrock:*::foundation-model/*"]},
            {"Effect": "Allow", "Action": ["bedrock-agentcore:*Browser*", "bedrock-agentcore:*Memory*", "bedrock-agentcore:*Event*",
                                           "bedrock-agentcore:RetrieveMemoryRecords", "bedrock-agentcore:ListMemoryRecords"],
             "Resource": [f"arn:aws:bedrock-agentcore:{region}:{account}:*", f"arn:aws:bedrock-agentcore:{region}:aws:browser/*"]},
            {"Effect": "Allow", "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams",
                                           "xray:PutTraceSegments", "xray:PutTelemetryRecords", "cloudwatch:PutMetricData"],
             "Resource": "*"},
            {"Effect": "Allow", "Action": ["ecr-public:GetAuthorizationToken", "sts:GetServiceBearerToken"], "Resource": "*"},
        ],
    })


def ensure_role(settings: config.Settings, account: str) -> str:
    iam = boto3.client("iam")
    try:
        arn = iam.get_role(RoleName=settings.role_name)["Role"]["Arn"]
    except iam.exceptions.NoSuchEntityException:
        arn = iam.create_role(RoleName=settings.role_name, AssumeRolePolicyDocument=trust_policy(account, settings.region))["Role"]["Arn"]
        say(f"Created role {arn}. Waiting for IAM to propagate.")
        time.sleep(12)
    iam.put_role_policy(RoleName=settings.role_name, PolicyName="vacation-chaos", PolicyDocument=role_policy(account, settings.region))
    return arn


def harness_config(settings: config.Settings) -> dict:
    return {
        "model": {"bedrockModelConfig": {"modelId": settings.model_id, "maxTokens": 2048}},
        "systemPrompt": [{"text": PROMPT}],
        "tools": [
            {"type": "agentcore_browser", "name": "browser", "config": {"agentCoreBrowser": {}}},
            {"type": "remote_mcp", "name": "show", "config": {"remoteMcp": {"url": f"{settings.show_url}/mcp/{settings.presenter_key}"}}},
        ],
        "memory": {"managedMemoryConfiguration": {"strategies": ["USER_PREFERENCE"]}},
        "maxIterations": 80,
        "maxTokens": 2048,
        "timeoutSeconds": 900,
    }


def find_harness(control, name: str) -> dict | None:
    for item in control.list_harnesses().get("harnesses", []):
        if item.get("harnessName") == name:
            return item
    return None


def wait_ready(control, harness_id: str) -> dict:
    while True:
        harness = control.get_harness(harnessId=harness_id)["harness"]
        status = harness.get("status")
        say(f"Harness status: {status}")
        if status == "READY":
            return harness
        if status and status.endswith("FAILED"):
            raise SystemExit(json.dumps(harness, default=str, indent=2))
        time.sleep(5)


def deploy(settings: config.Settings) -> None:
    account = boto3.client("sts").get_caller_identity()["Account"]
    role = ensure_role(settings, account)
    control = boto3.client("bedrock-agentcore-control", region_name=settings.region)
    existing = find_harness(control, settings.harness_name)
    if existing:
        harness_id = existing["harnessId"]
        control.update_harness(harnessId=harness_id, executionRoleArn=role, **harness_config(settings))
    else:
        harness_id = control.create_harness(harnessName=settings.harness_name, executionRoleArn=role, **harness_config(settings))["harness"]["harnessId"]
    harness = wait_ready(control, harness_id)
    say(f"Ready: {harness['arn']}")


def post_telemetry(settings: config.Settings, payload: dict) -> None:
    request = urllib.request.Request(
        f"{settings.show_url}/api/telemetry", data=json.dumps(payload).encode(), method="POST",
        headers={"content-type": "application/json", "x-presenter-key": settings.presenter_key},
    )
    urllib.request.urlopen(request, timeout=5).close()


def report(settings: config.Settings, event: dict, model: str) -> None:
    usage = event["metadata"].get("usage", {})
    latency = event["metadata"].get("metrics", {}).get("latencyMs", 0)
    post_telemetry(settings, {"inputTokens": usage.get("inputTokens", 0), "outputTokens": usage.get("outputTokens", 0),
                              "latencyMs": latency, "model": f"{model} on AgentCore"})


def harness_arn(settings: config.Settings) -> str:
    control = boto3.client("bedrock-agentcore-control", region_name=settings.region)
    arn = (find_harness(control, settings.harness_name) or {}).get("arn")
    if not arn:
        raise SystemExit("Deploy the harness first: harness.py deploy")
    return arn


def follow(settings: config.Settings, stream, model: str) -> None:
    for event in stream:
        if "metadata" in event:
            report(settings, event, model)
        if "messageStop" in event:
            say(f"Stop: {event['messageStop'].get('stopReason')}")


def invoke(settings: config.Settings, model: str | None) -> None:
    data = boto3.client("bedrock-agentcore", region_name=settings.region)
    extra = {"model": {"bedrockModelConfig": {"modelId": model, "maxTokens": 2048}}} if model else {}
    session = f"vacation-chaos-{uuid.uuid4()}"
    say(f"Session {session}")
    response = data.invoke_harness(
        harnessArn=harness_arn(settings), runtimeSessionId=session, actorId=ACTOR,
        messages=[{"role": "user", "content": [{"text": f"Start the mission. The SunnyHop site is at {settings.show_url}/site"}]}],
        **extra,
    )
    follow(settings, response["stream"], model or settings.model_id)


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy and run the Vacation Chaos AgentCore Harness")
    parser.add_argument("command", choices=["deploy", "invoke"])
    parser.add_argument("--model", help="Per-invocation model override (brain transplant)")
    args = parser.parse_args()
    settings = config.load()
    if args.command == "deploy":
        deploy(settings)
    else:
        invoke(settings, args.model)


if __name__ == "__main__":
    main()
