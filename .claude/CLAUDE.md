# VibeGuard

AI-generated code safety guardrails for vibe coding.

## Project Context

Read these documents for full project context:

- [Architecture](docs/architecture.md) — system design, data flow, and module boundaries
- [Specification](docs/spec.md) — rule format, findings schema, and CLI contract

## Quick Start

```bash
npm install
npm run build
npm run test
npm run vibeguard -- scan --repo .
```

## Agents

See [.claude/agents/](.claude/agents/) for task-specific agent configurations.
