# VibeGuard — Product Proposal

## 1. Final Decision

VibeGuard is locked as:

> **Dangerous-change detector for AI-assisted TypeScript diffs.**

The product promise is:

> **"This exact change can break security or production. Here is the evidence. Here is what to test."**

This positioning is final for v0. Do not keep debating names, slogans, category wording, or broader positioning. The next risk is not strategy. The next risk is avoiding implementation.

VibeGuard is worth building only if it becomes a precise, hunk-aware detector. It is not worth building as a generic scanner, a pretty checklist generator, or a filename sorter.

## 2. Core Problem

AI coding agents can now modify many files in one session. A developer may ask Claude Code, Codex, Cursor, OpenCode, Cline, or another coding agent to "clean up auth" or "fix deployment," and the agent may change:

- middleware,
- route handlers,
- auth/session logic,
- package scripts,
- CI workflows,
- dependency manifests,
- agent instructions,
- MCP configuration.

The real danger is not simply that "AI writes bad code." The danger is that AI-assisted diffs are often large, cross-cutting, and reviewed too quickly.

Developers do not need another tool that says:

> `middleware.ts changed.`

They need a tool that says:

> `matcher changed from "/dashboard/:path*" to "/dashboard". Nested routes may no longer be protected.`

That is the gap VibeGuard targets.

## 3. Target User

The first target user is intentionally narrow:

> Next.js / TypeScript builders using AI coding agents who allow agents to modify auth, CI/CD, dependencies, package scripts, or agent config.

This includes solo builders, maintainers, and small teams using:

- Claude Code,
- OpenAI Codex,
- Cursor,
- OpenCode,
- Cline,
- Gemini CLI,
- similar AI-assisted coding workflows.

VibeGuard does not need to prove whether a diff was written by AI. The user runs it when they know the diff is AI-assisted or high-risk.

## 4. Product Scope

The core command is:

```bash
vibeguard diff --preset nextjs-app-router
```

VibeGuard scans the current git diff and flags exact dangerous hunks with:

1. severity,
2. rule ID,
3. file path,
4. exact evidence,
5. why it matters,
6. suggested review,
7. suggested test.

The first product surface is the CLI. GitHub Action comes after the CLI and rule engine are solid.

## 5. v0 Scope

v0 must be smaller than the full proposal.

VibeGuard v0 ships only **5 excellent rules**:

1. **VG-AUTH-001 — Next.js middleware matcher narrowed**  
   Example: `"/dashboard/:path*"` → `"/dashboard"`

2. **VG-AUTH-002 — Cookie `httpOnly` removed**  
   Example: `httpOnly: true` → `httpOnly: false`

3. **VG-CI-001 — GitHub Actions permission expanded**  
   Example: `contents: read` → `contents: write` or `permissions: write-all`

4. **VG-DEP-001 — Remote shell execution added to package script**  
   Examples: `curl | bash`, `wget | sh`, `npx`, `eval`

5. **VG-AGENT-003 — Agent instruction tells model to skip validation**  
   Examples: `skip tests`, `ignore failing tests`, `bypass checks`

These 5 rules are enough. If these are not precise, adding 15–30 more rules only creates shallow noise.

## 6. Non-Goals

VibeGuard v0 must not include:

- universal language support,
- dashboard,
- HTML report,
- numeric risk score,
- AI API dependency,
- custom secret scanner,
- custom dependency intelligence,
- full session recorder,
- broad enterprise policy engine,
- noisy PR bot behavior,
- fake "AI attribution."

VibeGuard is not a replacement for:

- Semgrep,
- CodeQL,
- Gitleaks,
- TruffleHog,
- Socket,
- Snyk,
- GitHub Advanced Security,
- Dependabot,
- manual review.

It does one thing:

> It flags dangerous diff hunks commonly introduced during AI-assisted coding and suggests what to review and test.

## 7. Output Standard

A valid VibeGuard finding must look like this:

```txt
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

An invalid output is:

```txt
middleware.ts changed.
```

That output has no value.

The rule is simple:

> **No hunk evidence, no critical finding.**

## 8. Severity Constitution

VibeGuard must avoid warning spam. Severity must be strict.

### Critical

Use only when the diff likely weakens security, enables unsafe code execution, exposes secrets, or creates destructive production risk.

### High

Use when the diff is dangerous but requires more project context.

### Medium

Use when the diff requires review, but VibeGuard cannot prove a dangerous hunk.

### Low

Informational only.

v0 should prefer fewer, stronger findings over many weak warnings.

## 9. Why This Can Stand Out

VibeGuard does not win by being another scanner. Existing security tools are already stronger in their own domains.

VibeGuard wins by being the small, local, vendor-neutral tool that catches specific AI-assisted dangerous diff patterns before merge.

The differentiator is not the CLI. The differentiator is the rule corpus:

> A fixture-tested library of dangerous AI-assisted diff patterns with evidence and suggested tests.

That rule corpus is the open-source contribution surface.

## 10. Rule Quality Bar

Every v0 rule must have:

- trigger fixture,
- non-trigger fixture,
- expected JSON output,
- evidence text,
- severity justification,
- suggested review,
- suggested test.

No false-positive fixture means the rule is not mergeable.

No evidence means the rule cannot be critical.

No vague warning means the output must point to a concrete dangerous change.

## 11. Launch Demo

The first demo should show only one thing.

Scenario:

An AI agent is asked:

```txt
Clean up the auth middleware and protect dashboard routes.
```

Before:

```ts
export const config = {
  matcher: ["/dashboard/:path*"]
}
```

After:

```ts
export const config = {
  matcher: ["/dashboard"]
}
```

Run:

```bash
vibeguard diff --preset nextjs-app-router
```

VibeGuard catches the dangerous change.

Launch caption:

```txt
Claude cleaned up my auth middleware.

It accidentally stopped protecting nested dashboard routes.

VibeGuard caught the exact dangerous diff before merge.
```

## 12. README Opening

Use this without overthinking:

```md
# VibeGuard

Dangerous-change detector for AI-assisted TypeScript diffs.

AI coding agents can change auth, database migrations, CI workflows, dependencies, and agent config faster than you can review them.

VibeGuard scans your git diff and flags exact risky hunks before you merge.

It does not replace Semgrep, CodeQL, Gitleaks, TruffleHog, Socket, Snyk, GitHub Advanced Security, or manual review.

It does one thing:

It tells you when an AI-assisted diff contains a dangerous change, shows the evidence, and suggests what to test.
```

## 13. Success Criteria

VibeGuard v0 succeeds if a developer sees the output and says:

> "I could have missed that."

## 14. Failure Criteria

VibeGuard is failing if:

- findings are mostly filename-based,
- warnings are generic,
- CLI output is noisy,
- critical findings have no hunk evidence,
- rules work only on toy examples,
- fixtures are missing,
- false positives are ignored,
- the project drifts into dashboard/report/branding work before the engine is solid,
- GitHub Action becomes noisy by default.

## 15. Final Build Decision

Build it.

But build only the hard version:

> 5 excellent hunk-aware rules first.

Do not chase "repo of the day" yet. The first target is not virality.

The first target is:

> One developer runs VibeGuard and realizes it caught an exact dangerous change they could have missed.
