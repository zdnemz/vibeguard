# VG-AGENT-003 — Agent Instruction Tells Model to Skip Validation

## What happened

A developer was frustrated with slow test runs while iterating on a feature and asked the AI agent to optimize the workflow:

> "The test suite is too slow for rapid iteration. Update the agent config so it doesn't waste time running tests that aren't related to the current change."

The agent added an "Agent Instructions" section to `CLAUDE.md` with several directives telling the AI to skip tests, ignore failures in legacy modules, and skip validation on unchanged files. These instructions now apply to every future agent session on this repository.

## What VibeGuard catches

VibeGuard detects when agent configuration files (`CLAUDE.md`, `AGENTS.md`, `.cursor/**`, `.claude/**`, `.codex/**`, `.opencode/**`) gain instructions that tell models to skip tests, ignore failures, or bypass validation checks.

```
High VG-AGENT-003
File: CLAUDE.md

Agent instruction may suppress validation.

Evidence:
- added instruction: "skip tests if they are failing due to unrelated modules"
- added instruction: "do not run validation on unchanged files"
- added instruction: "ignore failing tests in legacy modules"

Why it matters:
The AI agent will skip tests and validation on future changes, allowing regressions to reach production without being caught.
```

## Why it matters

Agent instruction files are persistent configuration — they apply to every future session and every developer who uses the AI agent on this repository. Adding "skip tests" instructions has compounding effects:

- **Silent regressions:** The agent will not run tests when making changes, so broken functionality reaches production without anyone noticing.
- **Scope creep:** "Skip tests in legacy modules" often expands as the agent interprets "legacy" broadly, eventually skipping tests for actively maintained code.
- **Team-wide impact:** Unlike a one-time developer shortcut, these instructions affect every team member who uses the agent.
- **Difficult to debug:** When a bug reaches production, the team may not realize the agent skipped the relevant tests because the instruction was added weeks earlier in an unrelated change.

The correct approach is to fix slow tests (parallelize, split suites, mock expensive operations) rather than telling the agent to skip them. If specific modules genuinely need test exclusion, configure it in the test runner (`vitest.config.ts` exclude patterns) with explicit comments explaining why.

## The diff

```diff
+## Agent Instructions
+
+- When making changes, skip tests if they are failing due to unrelated modules
+- Do not run validation on unchanged files
+- If the test suite takes longer than 30 seconds, skip tests and focus on the implementation
+- Ignore failing tests in legacy modules under `src/lib/legacy/`
```

## How to verify

1. Review the agent configuration file for any instructions that suppress validation.
2. Ask the agent to make a code change and observe whether it runs the test suite.
3. Confirm that `vitest.config.ts` is the source of truth for test exclusion patterns, not agent instructions.
4. Remove the "skip tests" directives and instead optimize the test suite configuration directly.
