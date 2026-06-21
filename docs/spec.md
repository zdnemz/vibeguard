# VibeGuard — Technical Specification

## 1. Contract

VibeGuard v0 implements:

```bash
vibeguard diff --preset nextjs-app-router
```

It parses the current git diff, analyzes hunks using 5 high-quality rules, and outputs evidence-backed findings in terminal, JSON, and Markdown formats.

The product must remain local-first. No AI API is required. No numeric risk score is allowed.

## 2. Repository Structure

Use this structure:

```txt
vibeguard/
  packages/
    cli/
      src/
        commands/
          diff.ts
        output/
          terminal.ts
          markdown.ts
          json.ts

    core/
      src/
        diff/
          parse-unified-diff.ts
          hunk-model.ts
        rules/
          define-rule.ts
          rule-engine.ts
        findings/
          finding.ts
          prioritize.ts
          render.ts
        presets/
          nextjs-app-router.ts

    parsers/
      src/
        github-actions.ts
        package-json.ts
        mcp-json.ts
        nextjs-matcher.ts

    rules/
      nextjs-app-router/
      github-actions/
      dependencies/
      agent-config/

    github-action/
      action.yml
      src/index.ts

  examples/
    middleware-matcher-narrowed/
    cookie-httponly-removed/
    github-permission-expanded/
    package-remote-shell/
    agent-skip-tests/

  docs/
    severity.md
    rules.md
    contributing-rules.md
```

## 3. Build Order

Do not skip or reorder this.

### Step 1 — Diff parser

Implement:

```txt
packages/core/src/diff/parse-unified-diff.ts
packages/core/src/diff/hunk-model.ts
```

Required model:

```ts
export type DiffFile = {
  path: string
  oldPath?: string
  hunks: DiffHunk[]
}

export type DiffHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export type DiffLine = {
  type: "added" | "removed" | "context"
  content: string
  oldLine?: number
  newLine?: number
}
```

Parser requirements:

- parse modified files,
- parse added files,
- parse deleted files,
- parse multiple hunks per file,
- preserve line order,
- track old/new line numbers correctly,
- strip only the diff prefix marker (`+`, `-`, or space), not user content,
- ignore metadata lines like `index`, `---`, `+++`, and `diff --git`,
- tolerate `\ No newline at end of file`.

Acceptance test:

- `trigger.diff` for `VG-AUTH-001` must parse into one `DiffFile` with one `DiffHunk`.
- Removed matcher line must have `type: "removed"` and old line number.
- Added matcher line must have `type: "added"` and new line number.

### Step 2 — Finding model

Implement:

```txt
packages/core/src/findings/finding.ts
```

Required model:

```ts
export type Severity = "critical" | "high" | "medium" | "low"

export type Finding = {
  id: string
  severity: Severity
  file: string
  title: string
  evidence: string[]
  why: string
  review: string[]
  test: string[]
}
```

Rules:

- no `score`,
- no numeric ranking,
- severity only,
- `evidence` must not be empty for `critical` or `high`,
- `review` and `test` must be actionable.

### Step 3 — Rule engine

Implement:

```txt
packages/core/src/rules/define-rule.ts
packages/core/src/rules/rule-engine.ts
```

Minimal rule shape:

```ts
import type { DiffFile } from "../diff/hunk-model"
import type { Finding, Severity } from "../findings/finding"

export type Rule = {
  id: string
  severity: Severity
  preset: string
  match: string[]
  analyze(file: DiffFile): Finding[]
}
```

Engine behavior:

```ts
export function runRules(files: DiffFile[], rules: Rule[]): Finding[]
```

Requirements:

- run all matching rules against each file,
- match paths using glob patterns,
- return flat `Finding[]`,
- do not mutate `DiffFile`,
- sort findings by severity and original file order,
- allow multiple findings per file,
- allow zero findings.

Severity order:

```txt
critical > high > medium > low
```

### Step 4 — Implement first rule only

Start with only:

```txt
VG-AUTH-001 — Next.js middleware matcher narrowed
```

Do not implement all 5 rules before this one is excellent.

Rule target:

```txt
middleware.ts
src/middleware.ts
```

Detect:

```ts
matcher: ["/dashboard/:path*"]
```

changed to:

```ts
matcher: ["/dashboard"]
```

Minimum detection logic:

- within the same hunk,
- find removed line containing a matcher route with `/:path*`,
- find added line containing the same base route without `/:path*`,
- produce a critical finding.

Expected finding:

```json
{
  "id": "VG-AUTH-001",
  "severity": "critical",
  "file": "middleware.ts",
  "title": "Route protection may have been weakened.",
  "evidence": [
    "matcher changed from \"/dashboard/:path*\" to \"/dashboard\""
  ],
  "why": "Nested routes such as /dashboard/settings may no longer be protected.",
  "review": [
    "Confirm all nested dashboard routes still require authentication."
  ],
  "test": [
    "Request /dashboard/settings without a session.",
    "Expected: redirect or 401."
  ]
}
```

Fixture requirements:

```txt
rules/nextjs-app-router/VG-AUTH-001/
  trigger.diff
  non-trigger.diff
  expected.json
```

`non-trigger.diff` examples:

- `"/dashboard"` → `"/dashboard/:path*"` should not trigger.
- unrelated matcher formatting change should not trigger.
- matcher unchanged should not trigger.

### Step 5 — Terminal output

Implement:

```txt
packages/cli/src/output/terminal.ts
```

Default format:

```txt
VibeGuard found 1 dangerous change.

Critical: 1
High: 0
Medium: 0
Low: 0

Critical VG-AUTH-001
File: middleware.ts

Route protection may have been weakened.

Evidence:
- matcher changed from "/dashboard/:path*" to "/dashboard"

Why it matters:
Nested routes such as /dashboard/settings may no longer be protected.

Suggested review:
- Confirm all nested dashboard routes still require authentication.

Suggested test:
- Request /dashboard/settings without a session.
- Expected: redirect or 401.
```

No findings format:

```txt
VibeGuard found no dangerous changes for preset nextjs-app-router.
```

### Step 6 — CLI command

Implement:

```txt
packages/cli/src/commands/diff.ts
```

Command:

```bash
vibeguard diff --preset nextjs-app-router
```

Behavior:

- runs `git diff` by default,
- parses unified diff,
- loads preset rules,
- runs rule engine,
- renders output.

Options:

```bash
--preset nextjs-app-router
--format terminal|json|markdown
--base <ref>
--all
```

`--base main` behavior:

```bash
git diff main...HEAD
```

Default format:

```txt
terminal
```

### Step 7 — Add remaining 4 rules

After `VG-AUTH-001` is excellent, add:

## VG-AUTH-002 — Cookie httpOnly removed

Detect within same hunk:

```ts
httpOnly: true
```

changed to:

```ts
httpOnly: false
```

Finding:

```txt
Session cookie may now be readable by client-side JavaScript.
```

Suggested test:

```txt
Assert Set-Cookie includes HttpOnly.
```

Fixtures:

```txt
rules/nextjs-app-router/VG-AUTH-002/
  trigger.diff
  non-trigger.diff
  expected.json
```

## VG-CI-001 — GitHub Actions permission expanded

Target:

```txt
.github/workflows/*.yml
.github/workflows/*.yaml
```

Detect:

```yaml
contents: read
```

changed to:

```yaml
contents: write
```

or added:

```yaml
permissions: write-all
```

Finding:

```txt
GitHub token permissions were expanded.
```

Suggested review:

```txt
Confirm the workflow needs write access.
```

Suggested test:

```txt
Run workflow with least-privilege permissions.
```

Fixtures:

```txt
rules/github-actions/VG-CI-001/
  trigger.diff
  non-trigger.diff
  expected.json
```

## VG-DEP-001 — Remote shell execution added to package script

Target:

```txt
package.json
```

Detect added package scripts containing:

```txt
curl ... | bash
wget ... | sh
npx ...
eval(...)
```

Finding:

```txt
Package script added remote or dynamic code execution.
```

Suggested review:

```txt
Confirm the script source is trusted and pinned.
```

Suggested test:

```txt
Run install scripts in a clean sandbox before merging.
```

Fixtures:

```txt
rules/dependencies/VG-DEP-001/
  trigger.diff
  non-trigger.diff
  expected.json
```

## VG-AGENT-003 — Agent instruction tells model to skip validation

Target:

```txt
AGENTS.md
CLAUDE.md
.cursor/**
.claude/**
.codex/**
.opencode/**
```

Detect added text containing:

```txt
skip tests
ignore failing tests
bypass checks
do not run validation
ignore errors
```

Finding:

```txt
Agent instruction may suppress validation.
```

Suggested review:

```txt
Remove instructions that tell agents to skip tests or ignore failures.
```

Suggested test:

```txt
Ask the agent to make a change and confirm it still runs validation.
```

Fixtures:

```txt
rules/agent-config/VG-AGENT-003/
  trigger.diff
  non-trigger.diff
  expected.json
```

### Step 8 — JSON output

Implement:

```txt
packages/cli/src/output/json.ts
```

Command:

```bash
vibeguard diff --format json
```

Output shape:

```ts
export type VibeGuardJsonOutput = {
  preset: string
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
  findings: Finding[]
}
```

Requirements:

- stable key order,
- valid JSON,
- no ANSI colors,
- useful for GitHub Action.

### Step 9 — Markdown output

Implement:

```txt
packages/cli/src/output/markdown.ts
```

Command:

```bash
vibeguard diff --format markdown
```

Output shape:

```md
# VibeGuard Findings

Preset: `nextjs-app-router`

Summary:

- Critical: 1
- High: 0
- Medium: 0
- Low: 0

## Critical VG-AUTH-001

File: `middleware.ts`

Route protection may have been weakened.

### Evidence

- matcher changed from "/dashboard/:path*" to "/dashboard"

### Why it matters

Nested routes such as /dashboard/settings may no longer be protected.

### Suggested review

- Confirm all nested dashboard routes still require authentication.

### Suggested test

- Request /dashboard/settings without a session.
- Expected: redirect or 401.
```

### Step 10 — GitHub Action

Only after CLI output is excellent.

Default action behavior:

```yaml
comment-on: high
fail-on: never
```

Requirements:

- run VibeGuard in JSON mode,
- create Markdown summary,
- comment only when high/critical findings exist,
- do not fail CI by default,
- allow `fail-on: critical`,
- upload Markdown artifact if possible.

Initial action config:

```yaml
name: VibeGuard

on:
  pull_request:

jobs:
  vibeguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: vibeguard/vibeguard-action@v1
        with:
          preset: nextjs-app-router
          comment-on: high
          fail-on: never
```

## 4. Rule Fixtures Standard

Every rule directory must contain:

```txt
trigger.diff
non-trigger.diff
expected.json
```

Optional:

```txt
README.md
```

Rules cannot be merged without false-positive fixtures.

`expected.json` must match the actual JSON output for that rule.

## 5. Prioritization

Implement:

```txt
packages/core/src/findings/prioritize.ts
```

Rules:

- sort by severity,
- preserve file order within severity,
- preserve rule order within file,
- show top findings by default,
- `--all` shows everything.

Severity order:

```ts
const severityRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
} as const
```

## 6. Non-Negotiables

1. No hunk evidence, no critical finding.
2. No numeric risk score.
3. No vague warning.
4. No universal preset in v0.
5. No AI API dependency.
6. No custom secret scanner.
7. No dashboard.
8. No HTML report before CLI output is excellent.
9. No rule without trigger and non-trigger fixtures.
10. No noisy GitHub Action default.

## 7. v0 Acceptance Criteria

VibeGuard v0 is accepted only when:

```bash
vibeguard diff --preset nextjs-app-router
```

can detect all 5 v0 rules with:

- exact hunk evidence,
- readable terminal output,
- valid JSON output,
- valid Markdown output,
- trigger fixture,
- non-trigger fixture,
- expected JSON fixture,
- no numeric score,
- no generic warning.

## 8. First Implementation Task

The first implementation task is only:

> Build the unified diff parser and hunk model.

Do not implement rules before the parser is tested.

Parser quality determines the entire product quality.
