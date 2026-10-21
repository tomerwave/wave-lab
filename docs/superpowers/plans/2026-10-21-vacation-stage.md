# Vacation Stage Implementation Plan

> **For agentic workers:** Execute natively with superpowers:executing-plans, then an independent reviewer checks the entire branch.

**Goal:** A fullscreen real AgentCore vacation demo with autonomous Jev decisions and cumulative human constraints.
**Architecture:** Keep legacy CLI. Add domain/controller, stage offer page and browser adapter, Jev selector and loopback dashboard. State is authoritative, page mutations are visible, tool boundaries gate presenter events.
**Tech Stack:** Existing TypeScript, Node HTTP, TypeSafe SDK, AgentCore SDK, vanilla JS/DCV.
**Spec:** docs/superpowers/specs/2026-10-21-vacation-stage-design.md

## Global Constraints
- Never book, expose payment or incur paid service calls during implementation.
- All offers/events fictional; no initial clean requirement; refunds required for both components.
- No new dependencies; preserve original checkout and CLI.
- Only real AgentCore DCV in live running dashboard. Offline is explicitly disconnected.

## Review Focus
- Duplicate votes and stale reset requests cannot mutate another checkpoint/run.
- Stop/reset during a pending model/tool/start operation cannot lead to late actions or leaked sessions.
- Budget changes require explicit human answer; halve the latest approved value exactly once.
- Site observations carry all policy/world changes; stale selections never reach review.
- Signed stream URLs/keys never enter persistent replay/logs; local control rejects foreign origins.

### Task 1: Domain and controller
- [x] Add failing tests for initial requirements, branch events, event deduplication, requirement messages, policy checks and checkpoints.
- [x] Implement focused stage state/controller modules; add bounded decision loop with injectable selector/browser and human question gate.
- [x] Run domain tests; verify stop/reset, repeated votes and stale decision behavior.

### Task 2: Real site, browser and Jev adapters
- [x] Add tests for SDK payload/cancellation and page policies, real local DOM transitions and observed world updates.
- [x] Implement AgentCore adapter with finite session, visible page updates and same-session DCV URL; implement Jev choice from actual installed API.
- [x] Run local browser tests with existing Chromium. Keep live services disabled.

### Task 3: Dashboard and operational docs
- [x] Test HTTP run guards, loopback/origin checks, status redaction, replay and static SDK delivery.
- [x] Implement fullscreen DCV view, transient vote/question dialogs, controls/log overlay, reset/replay, emergency stop and explicit live opt-in.
- [x] Run typecheck, full check, local browser and dashboard QA. Document honest live limitations and exact rehearsal commands.
- [x] Independent code review; fix material findings and repeat affected checks.
- [ ] Commit requested changes and push feature branch to verified origin; leave original checkout intact.

Local-first follow-up: added a separate manual local controller and real same-origin site, with no mock AI decisions; verified local UI end to end and retained the paid integrations for later approval.
