---
id: wavelab-demo-boundaries
title: WaveLab demo boundaries
keywords: [demo, billing, refund, agent, mastra, policy]
paths: ["demos/**", ".github/**"]
must-read: true
supersedes: []
relates-to: []
---

## Rule

Use fictional data and simulated payments. Keep authorization in the billing service, outside model input. Never expose unsafeRefund as an agent tool. Label scripted replay honestly. Run npm run check before proposing a change.

## Why

These examples teach the difference between model choice and server authority. An intentionally unsafe CLI function demonstrates a failure; it is not a production recommendation.

## How to apply

Read configuration only in each demo's src/config.ts and print user-facing CLI output only through src/output.ts. These are scoped Godlint boundaries, not exclusions from the scan. The main branch is permitted alongside conventional feature branches.

The refund ledger is in memory. Keep its check-and-record section synchronous with no await. Production payments require durable idempotency; explain that limitation in the demo README. Keep explanatory prose in documentation. Test rejected operations for absence of side effects and run the five offline scenarios after changing the CLI.
