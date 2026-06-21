# VibeGuard

Dangerous-change detector for AI-assisted TypeScript diffs.

AI coding agents can change auth, database migrations, CI workflows, dependencies, and agent config faster than you can review them.

VibeGuard scans your git diff and flags exact risky hunks before you merge.

It does not replace Semgrep, CodeQL, Gitleaks, TruffleHog, Socket, Snyk, GitHub Advanced Security, or manual review.

It does one thing:

It tells you when an AI-assisted diff contains a dangerous change, shows the evidence, and suggests what to test.

---

## Installation

```bash
npm install -g vibeguard
```

Requires Node.js 18+ and Git.

---

## Quick Start

Run VibeGuard against your current uncommitted changes:

```bash
vibeguard diff --preset nextjs-app-router
```

Compare your branch against `main`:

```bash
vibeguard diff --preset nextjs-app-router --base main
```

Output (terminal):

```
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

When no dangerous changes are found:

```
VibeGuard found no dangerous changes for preset nextjs-app-router.
```

---

## Available Presets

| Preset | Description |
|---|---|
| `nextjs-app-router` | Rules for Next.js App Router projects — covers middleware matchers, cookie config, GitHub Actions permissions, package scripts, and agent instruction files. |

More presets are planned. See [Contributing](#contributing) for how to propose new rules and presets.

---

## Output Formats

Control the output format with `--format`:

```bash
vibeguard diff --preset nextjs-app-router --format terminal   # default
vibeguard diff --preset nextjs-app-router --format json
vibeguard diff --preset nextjs-app-router --format markdown
```

### Terminal (default)

Human-readable output with severity labels, evidence, and suggested tests. Uses ANSI color when writing to a TTY.

### JSON

Machine-readable output for CI pipelines and the GitHub Action. Stable key order, no ANSI codes.

```json
{
  "preset": "nextjs-app-router",
  "summary": {
    "total": 1,
    "critical": 1,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "findings": [
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
  ]
}
```

### Markdown

GitHub-flavored Markdown suitable for PR comments and reports.

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

---

## Options

| Option | Description |
|---|---|
| `--preset <name>` | **Required.** Rule preset to use. Available: `nextjs-app-router`. |
| `--format <type>` | Output format: `terminal` (default), `json`, or `markdown`. |
| `--base <ref>` | Compare against a Git ref instead of uncommitted changes. Runs `git diff <ref>...HEAD`. |
| `--all` | Show all findings. By default, findings are sorted by severity with critical and high findings shown first. |

---

## v0 Rules

VibeGuard v0 ships 5 precise, hunk-aware rules. Every rule requires exact diff evidence — no filename-only guesses, no generic warnings.

| Rule ID | Severity | Description |
|---|---|---|
| **VG-AUTH-001** | Critical | **Next.js middleware matcher narrowed.** Detects when a route matcher with `/:path*` is replaced by the same route without it (e.g., `"/dashboard/:path*"` → `"/dashboard"`), which stops protecting nested routes. |
| **VG-AUTH-002** | Critical | **Cookie `httpOnly` removed.** Detects when `httpOnly: true` is changed to `httpOnly: false` in the same hunk, exposing the session cookie to client-side JavaScript and XSS attacks. |
| **VG-CI-001** | High | **GitHub Actions permission expanded.** Detects when workflow permissions are widened (e.g., `contents: read` → `contents: write`, or `permissions: write-all` is added), granting the CI token more access than intended. |
| **VG-DEP-001** | High | **Remote shell execution added to package script.** Detects when a `package.json` script is added that pipes remote content into a shell (`curl \| bash`, `wget \| sh`, `npx`, `eval`), introducing a supply chain attack vector. |
| **VG-AGENT-003** | High | **Agent instruction tells model to skip validation.** Detects when agent configuration files (`CLAUDE.md`, `AGENTS.md`, `.cursor/**`, `.claude/**`, `.codex/**`, `.opencode/**`) gain instructions like `skip tests`, `ignore failing tests`, or `bypass checks`. |

Each rule produces a finding with: severity, rule ID, file path, exact evidence from the diff hunk, explanation of why it matters, suggested review steps, and a suggested test.

See the [examples/](examples/) directory for realistic before/after scenarios for each rule.

---

## GitHub Action

Run VibeGuard on every pull request. The action comments on PRs when high or critical findings are detected.

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

### Action Inputs

| Input | Default | Description |
|---|---|---|
| `preset` | — | **Required.** Rule preset to use (e.g., `nextjs-app-router`). |
| `comment-on` | `high` | Minimum severity to post a PR comment. Set to `high` to comment on high and critical findings, or `critical` for critical only. |
| `fail-on` | `never` | Minimum severity to fail the CI check. Set to `critical` to fail on critical findings, or `never` (default) to never fail. |

The action runs VibeGuard in JSON mode, generates a Markdown summary, and uploads it as a build artifact.

---

## Contributing

VibeGuard's value comes from its rule corpus — a fixture-tested library of dangerous AI-assisted diff patterns with evidence and suggested tests.

See [docs/contributing-rules.md](docs/contributing-rules.md) for the full guide on how to propose, implement, and test new rules.

### Rule Quality Bar

Every rule must meet these requirements before it can be merged:

- **Hunk-aware detection** — operates on diff content, not just filenames.
- **Trigger fixture** — a realistic diff that triggers the rule.
- **Non-trigger fixture** — a realistic diff that does NOT trigger (false-positive guard).
- **Expected output** — `expected.json` that matches the actual finding output exactly.
- **Evidence text** — points to specific hunk content, never generic.
- **No numeric scores** — severity only (`critical`, `high`, `medium`, `low`).
- **Actionable review and test suggestions** — tells the reviewer what to check and what to test.

Rules that only work on toy examples will not be accepted.

---

## License

MIT
