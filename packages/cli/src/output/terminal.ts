/**
 * VibeGuard terminal output formatter.
 *
 * Formats findings for display in a terminal with ANSI colors.
 * Matches the format specified in the VibeGuard spec.
 */

import type { Finding, Severity } from '@vibeguard/core'

/** ANSI color codes */
const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  green: '\x1b[32m',
} as const

/** Map severity to its display color */
const severityColor: Record<Severity, string> = {
  critical: ansi.red,
  high: ansi.yellow,
  medium: ansi.cyan,
  low: ansi.gray,
}

/** Count findings by severity */
function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }
  for (const f of findings) {
    counts[f.severity]++
  }
  return counts
}

/** Capitalize the first letter of a string */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Format findings for terminal output.
 *
 * When findings is empty, shows the "no dangerous changes" message.
 * When findings exist, shows summary counts and each finding's details.
 */
export function formatTerminal(findings: Finding[], presetName: string): string {
  if (findings.length === 0) {
    return `${ansi.bold}VibeGuard${ansi.reset} found no dangerous changes for preset ${presetName}.`
  }

  const counts = countBySeverity(findings)
  const lines: string[] = []

  // Header
  const plural = findings.length === 1 ? 'change' : 'changes'
  lines.push(`${ansi.bold}VibeGuard${ansi.reset} found ${findings.length} dangerous ${plural}.`)
  lines.push('')

  // Summary counts
  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low']
  for (const sev of severityOrder) {
    const color = severityColor[sev]
    lines.push(`${color}${capitalize(sev)}${ansi.reset}: ${counts[sev]}`)
  }

  // Each finding
  for (const finding of findings) {
    lines.push('')
    const color = severityColor[finding.severity]

    // Severity + ID
    lines.push(`${ansi.bold}${color}${capitalize(finding.severity)} ${finding.id}${ansi.reset}`)

    // File
    lines.push(`File: ${finding.file}`)
    lines.push('')

    // Title
    lines.push(finding.title)

    // Evidence
    if (finding.evidence.length > 0) {
      lines.push('')
      lines.push('Evidence:')
      for (const e of finding.evidence) {
        lines.push(`- ${e}`)
      }
    }

    // Why it matters
    lines.push('')
    lines.push('Why it matters:')
    lines.push(finding.why)

    // Suggested review
    lines.push('')
    lines.push('Suggested review:')
    for (const r of finding.review) {
      lines.push(`- ${r}`)
    }

    // Suggested test
    lines.push('')
    lines.push('Suggested test:')
    for (const t of finding.test) {
      lines.push(`- ${t}`)
    }
  }

  return lines.join('\n')
}
