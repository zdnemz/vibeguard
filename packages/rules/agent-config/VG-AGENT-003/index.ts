/**
 * VG-AGENT-003 — Agent instruction tells model to skip validation
 *
 * Detects when agent configuration files (AGENTS.md, CLAUDE.md, etc.)
 * add instructions that tell the AI model to skip tests, ignore errors,
 * or bypass validation checks.
 */

import type { DiffFile, DiffHunk, DiffLine } from '@vibeguard/core'
import type { Finding, Rule } from '@vibeguard/core'

/** Patterns that indicate validation suppression */
const SUPPRESSION_PATTERNS: RegExp[] = [
  /skip tests/i,
  /ignore failing tests/i,
  /bypass checks/i,
  /do not run validation/i,
  /ignore errors/i,
]

/**
 * Check if a line contains a validation suppression instruction.
 */
function isSuppression(content: string): boolean {
  return SUPPRESSION_PATTERNS.some(pattern => pattern.test(content))
}

/**
 * Analyze a single hunk for suppression instructions.
 * Only looks at ADDED lines.
 */
function analyzeHunk(hunk: DiffHunk): DiffLine[] {
  return hunk.lines.filter(
    (l): l is DiffLine & { type: 'added' } => l.type === 'added' && isSuppression(l.content)
  )
}

/**
 * Analyze an agent config file diff for validation suppression.
 */
function analyze(file: DiffFile): Finding[] {
  const findings: Finding[] = []

  for (const hunk of file.hunks) {
    const suppressionLines = analyzeHunk(hunk)

    if (suppressionLines.length > 0) {
      findings.push({
        id: 'VG-AGENT-003',
        severity: 'high',
        file: file.path,
        title: 'Agent instruction may suppress validation.',
        evidence: suppressionLines.map(l => `Added: ${l.content.trim()}`),
        why: 'Instructions that tell the AI to skip tests or ignore errors can silently disable quality gates, allowing broken or insecure code to pass.',
        review: [
          'Remove instructions that suppress test execution or validation.',
          'Ensure CI/CD pipelines enforce all checks regardless of agent instructions.',
        ],
        test: [
          'Run the full test suite after the agent produces code and verify all tests execute.',
          'Introduce a deliberate test failure and confirm the agent does not skip it.',
        ],
      })
    }
  }

  return findings
}

export const vgAgent003: Rule = {
  id: 'VG-AGENT-003',
  severity: 'high',
  preset: 'nextjs-app-router',
  match: [
    'AGENTS.md',
    'CLAUDE.md',
    '.cursor/**',
    '.claude/**',
    '.codex/**',
    '.opencode/**',
  ],
  analyze,
}
