# VG-DEP-001 — Remote Shell Execution Added to Package Script

## What happened

A developer asked an AI agent to streamline the local development setup:

> "Add a setup script so new developers can get the environment configured in one command."

The agent added a `setup:env` script to `package.json` that downloads and executes a shell script from a remote GitHub repository. The script installs system dependencies, configures `.env` files, and sets up the local database. It works perfectly — but it pipes arbitrary remote code directly into bash.

## What VibeGuard catches

VibeGuard detects when a `package.json` script is added or modified to include remote shell execution patterns: `curl | bash`, `wget | sh`, `npx` (fetching from registry), or `eval()`.

```
High VG-DEP-001
File: package.json

Package script added remote or dynamic code execution.

Evidence:
- added script "setup:env" containing "curl ... | bash"

Why it matters:
Any developer or CI runner who executes `npm run setup:env` will run arbitrary code fetched from a remote URL.
```

## Why it matters

Piping a remote script into bash is a well-known supply chain attack vector:

- **Man-in-the-middle:** If the URL is fetched over HTTP (or HTTPS without certificate pinning), an attacker on the network can inject malicious code into the response.
- **Repository compromise:** If the `acme/infra` repository is compromised, the script can be replaced with malicious code that exfiltrates environment variables, SSH keys, or credentials.
- **Partial download:** If the connection drops mid-download, bash may execute a truncated script that leaves the system in an inconsistent state.
- **No audit trail:** Unlike npm packages (which are versioned and auditable), a raw URL always fetches the latest version with no integrity check.

The correct approach is to distribute setup tooling as a versioned npm package, a Docker image, or a committed script in the repository — not a remote URL piped to bash.

## The diff

```diff
     "typecheck": "tsc --noEmit"
+    "setup:env": "curl -fsSL https://raw.githubusercontent.com/acme/infra/main/scripts/env-setup.sh | bash"
   },
```

## How to verify

1. Review the remote script content and confirm the source repository is trusted.
2. Check whether the script URL is pinned to a specific commit SHA rather than a branch name.
3. Run `npm run setup:env` in a clean sandbox (container or VM) and inspect what it modifies before allowing it on developer machines.
4. Consider committing the setup script to the repository instead of fetching it remotely.
