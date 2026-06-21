# VG-CI-001 — GitHub Actions Permission Expanded

## What happened

A developer asked an AI agent to add auto-tagging to the CI pipeline:

> "Add a step to the CI workflow that pushes a version tag after tests pass on main."

The agent added the tagging step and updated the workflow's `permissions` from `contents: read` to `contents: write` so the workflow can push tags. The tagging step was later removed during review, but the permission expansion stayed in the diff.

## What VibeGuard catches

VibeGuard detects when GitHub Actions workflow permissions are expanded — specifically when `contents: read` is changed to `contents: write`, or when `permissions: write-all` is added.

```
High VG-CI-001
File: .github/workflows/ci.yml

GitHub token permissions were expanded.

Evidence:
- contents permission changed from "read" to "write"

Why it matters:
The GITHUB_TOKEN now has write access to the repository contents, which could be exploited if a workflow step is compromised.
```

## Why it matters

GitHub Actions workflows run with a `GITHUB_TOKEN` whose permissions are scoped by the `permissions` key. Expanding from `read` to `write` means:

- If a workflow step is compromised (malicious npm package, typosquatted action, PR from a fork that modifies the workflow), the attacker's code can push commits, create tags, or modify repository contents.
- The principle of least privilege is violated — the test and lint jobs never needed write access.
- Supply chain attacks on GitHub Actions are increasingly common. A compromised action can leverage the `GITHUB_TOKEN` to push malicious code into the repository.

The correct approach is to grant `contents: write` only on the specific job that needs it, not on the entire workflow.

## The diff

```diff
 permissions:
-  contents: read
+  contents: write
```

## How to verify

1. Check whether any job in the workflow actually pushes to the repository.
2. If only one job needs write access, move the permission to that job's `permissions` block instead of the workflow-level `permissions`.
3. Run the workflow with `contents: read` and confirm all jobs pass.
