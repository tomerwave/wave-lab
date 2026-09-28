---
id: vacation-agent-boundaries
title: Vacation agent boundaries
keywords: [demo, vacation, hotel, jev, strands, agentcore, playwright, browser]
paths: ["demos/vacation-agent/**"]
must-read: true
supersedes: []
relates-to: [wavelab-demo-boundaries]
---

## Rule

The model returns one action id from the list the code offers. The code resolves it through the registry, reads fresh page state, checks it, and only then clicks. Budget and accessibility are checked in code. The agent never clicks pay, and the planner cannot change the conditions.

## Why

The talk teaches the gap between a valid choice and a correct one. If a check moves into the prompt, or the planner can edit the budget, the demo stops showing that gap.

## How to apply

Keep hotels, prices and the site fictional. Keep the planner's find_hotel tool free of input. Label scripted and careless choices in the CLI output. After changing the CLI or the loop, regenerate and compare the four recorded runs in demos/vacation-agent/examples. Do not describe the Jev, Strands or AgentCore paths as verified unless they were run against those services.
