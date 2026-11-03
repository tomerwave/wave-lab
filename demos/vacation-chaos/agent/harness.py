import argparse
import json
import time
import uuid
from pathlib import Path

import boto3
from botocore.config import Config

import config
from output import say
from show_api import post

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


def model_resources(account: str, models: list[str]) -> list[str]:
    profiles = [f"arn:aws:bedrock:*:{account}:inference-profile/{m}" for m in models]
    foundations = [f"arn:aws:bedrock:*::foundation-model/{m.split('.', 1)[1]}" for m in models]
    return profiles + foundations


def role_policy(settings: config.Settings, account: str) -> str:
    region, models = settings.region, [settings.model_id, settings.transplant_model_id]
    own = f"arn:aws:bedrock-agentcore:{region}:{account}"
    logs = f"arn:aws:logs:{region}:{account}:log-group:/aws/bedrock-agentcore/runtimes/*"
    statements = [
        ("BedrockModels", ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"], model_resources(account, models)),
        ("EcrPublicPull", ["ecr-public:GetAuthorizationToken", "sts:GetServiceBearerToken"], ["*"]),
        ("Tracing", ["xray:PutTraceSegments", "xray:PutTelemetryRecords", "xray:GetSamplingRules", "xray:GetSamplingTargets"], ["*"]),
        ("LogGroups", ["logs:CreateLogGroup", "logs:DescribeLogStreams"], [logs]),
        ("LogStreams", ["logs:CreateLogStream", "logs:PutLogEvents"], [f"{logs}:log-stream:*"]),
        ("WorkloadIdentity", ["bedrock-agentcore:GetWorkloadAccessToken", "bedrock-agentcore:GetWorkloadAccessTokenForJWT"],
         [f"{own}:workload-identity-directory/default", f"{own}:workload-identity-directory/default/workload-identity/harness_*"]),
        ("Browser", ["bedrock-agentcore:StartBrowserSession", "bedrock-agentcore:StopBrowserSession", "bedrock-agentcore:GetBrowserSession",
                     "bedrock-agentcore:ListBrowserSessions", "bedrock-agentcore:UpdateBrowserStream",
                     "bedrock-agentcore:ConnectBrowserAutomationStream", "bedrock-agentcore:ConnectBrowserLiveViewStream"],
         [f"arn:aws:bedrock-agentcore:{region}:aws:browser/*"]),
        ("Memory", ["bedrock-agentcore:CreateEvent", "bedrock-agentcore:GetEvent", "bedrock-agentcore:ListEvents",
                    "bedrock-agentcore:RetrieveMemoryRecords"], [f"{own}:memory/{settings.harness_name}-*"]),
    ]
    metrics = {"Sid": "Metrics", "Effect": "Allow", "Action": "cloudwatch:PutMetricData", "Resource": "*",
               "Condition": {"StringEquals": {"cloudwatch:namespace": "bedrock-agentcore"}}}
    return json.dumps({"Version": "2012-10-17", "Statement": [
        *({"Sid": sid, "Effect": "Allow", "Action": actions, "Resource": resources} for sid, actions, resources in statements), metrics]})


def ensure_role(settings: config.Settings, account: str) -> str:
    iam = boto3.client("iam")
    try:
        arn = iam.get_role(RoleName=settings.role_name)["Role"]["Arn"]
    except iam.exceptions.NoSuchEntityException:
        arn = iam.create_role(RoleName=settings.role_name, AssumeRolePolicyDocument=trust_policy(account, settings.region))["Role"]["Arn"]
        say(f"Created role {arn}. Waiting for IAM to propagate.")
        time.sleep(12)
    iam.update_assume_role_policy(RoleName=settings.role_name, PolicyDocument=trust_policy(account, settings.region))
    iam.put_role_policy(RoleName=settings.role_name, PolicyName="vacation-chaos",
                        PolicyDocument=role_policy(settings, account))
    return arn


BROWSER = {"type": "agentcore_browser", "name": "browser", "config": {"agentCoreBrowser": {}}}
ALLOWED_TOOLS = ["@browser", "@show"]
TOKENS_PER_REPLY = 2048
TOKENS_PER_RUN = 40_000
RUN_TIMEOUT_SECONDS = 1800
TRUNCATION = {"strategy": "sliding_window", "config": {"slidingWindow": {"messagesCount": 20}}}
STREAM = Config(read_timeout=RUN_TIMEOUT_SECONDS + 60, retries={"max_attempts": 1})


def run_tools(settings: config.Settings) -> list:
    show = {"type": "remote_mcp", "name": "show", "config": {"remoteMcp": {"url": settings.mcp_url, "headers": settings.mcp_headers}}}
    return [BROWSER, show]


def harness_config(settings: config.Settings) -> dict:
    return {
        "model": {"bedrockModelConfig": {"modelId": settings.model_id, "maxTokens": TOKENS_PER_REPLY}},
        "systemPrompt": [{"text": PROMPT}],
        "tools": [BROWSER],
        "allowedTools": ALLOWED_TOOLS,
        "truncation": TRUNCATION,
        "maxIterations": 120,
        "maxTokens": TOKENS_PER_RUN,
        "timeoutSeconds": RUN_TIMEOUT_SECONDS,
    }


MEMORY = {"managedMemoryConfiguration": {"strategies": ["USER_PREFERENCE"]}}


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
        harness_id = control.create_harness(harnessName=settings.harness_name, executionRoleArn=role, memory=MEMORY, **harness_config(settings))["harness"]["harnessId"]
    harness = wait_ready(control, harness_id)
    say(f"Ready: {harness['arn']}")


def report(settings: config.Settings, event: dict, model: str) -> None:
    usage = event["metadata"].get("usage", {})
    latency = event["metadata"].get("metrics", {}).get("latencyMs", 0)
    post(settings, "/api/telemetry", {"inputTokens": usage.get("inputTokens", 0), "outputTokens": usage.get("outputTokens", 0),
                              "latencyMs": latency, "model": f"{model} on AgentCore"})


def report_run(settings: config.Settings, session: str) -> None:
    control = boto3.client("bedrock-agentcore-control", region_name=settings.region)
    harness = control.get_harness(harnessId=(find_harness(control, settings.harness_name) or {}).get("harnessId", ""))["harness"]
    runtime = harness["environment"]["agentCoreRuntimeEnvironment"]["agentRuntimeId"]
    memory = harness.get("memory", {}).get("managedMemoryConfiguration", {}).get("arn", "").rsplit("/", 1)[-1]
    post(settings, "/api/run", {"sessionId": session, "region": settings.region, "harnessId": harness["harnessId"], "runtimeId": runtime, "memoryId": memory})


def harness_arn(settings: config.Settings) -> str:
    control = boto3.client("bedrock-agentcore-control", region_name=settings.region)
    arn = (find_harness(control, settings.harness_name) or {}).get("arn")
    if not arn:
        raise SystemExit("Deploy the harness first: harness.py deploy")
    return arn


def describe(event: dict) -> str | None:
    start = event.get("contentBlockStart", {}).get("start", {})
    if "toolUse" in start:
        return f"Tool: {start['toolUse'].get('name')}"
    for kind in ("validationException", "internalServerException", "runtimeClientError"):
        if kind in event:
            return f"{kind}: {event[kind].get('message')}"
    return f"Stop: {event['messageStop'].get('stopReason')}" if "messageStop" in event else None


def follow(settings: config.Settings, stream, model: str) -> None:
    text = ""
    for event in stream:
        if "metadata" in event:
            report(settings, event, model)
        text += event.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
        line = describe(event)
        if line:
            say(f"Agent: {text.strip()}\n{line}" if text.strip() else line)
            text = ""


def invoke(settings: config.Settings, model: str | None) -> None:
    if model and model not in (settings.model_id, settings.transplant_model_id):
        raise SystemExit(f"Model {model} is not allowed. Use {settings.model_id} or {settings.transplant_model_id}.")
    data = boto3.client("bedrock-agentcore", region_name=settings.region, config=STREAM)
    extra = {"model": {"bedrockModelConfig": {"modelId": model, "maxTokens": TOKENS_PER_REPLY}}} if model else {}
    session = f"vacation-chaos-{uuid.uuid4()}"
    say(f"Session {session}")
    report_run(settings, session)
    response = data.invoke_harness(
        harnessArn=harness_arn(settings), runtimeSessionId=session, actorId=ACTOR, tools=run_tools(settings), allowedTools=ALLOWED_TOOLS,
        messages=[{"role": "user", "content": [{"text": settings.start_message}]}],
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
