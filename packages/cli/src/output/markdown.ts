/**
 * VibeGuard Markdown output formatter.
 *
 * Produces a Markdown report suitable for GitHub PR comments
 * or CI step summaries. No ANSI colors.
 */

import type { Finding, Severity } from '@vibeguard/core'

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

/** Group findings by severity */
function groupBySeverity(findings: Finding[]): Map<Severity, Finding[]> {
  const groups = new Map<Severity, Finding[]>()
  for (const sev of ['critical', 'high', 'medium', 'low'] as Severity[]) {
    const matching = findings.filter(f => f.severity === sev)
    if (matching.length > 0) {
      groups.set(sev, matching)
    }
  }
  return groups
}

/**
 * Format findings as a Markdown document.
 *
 * Structure:
 * - # VibeGuard Report
 * - ## Summary (table)
 * - ## Findings (grouped by severity)
 */
export function formatMarkdown(preset: string, findings: Finding[]): string {
  const counts = countBySeverity(findings)
  const lines: string[] = []

  // Header
  lines.push('# VibeGuard Report')
  lines.push('')
  lines.push(`**Preset:** ${preset}`)
  lines.push('')

  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Severity | Count |')
  lines.push('|----------|-------|')
  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low']
  for (const sev of severityOrder) {
    lines.push(`| ${capitalize(sev)} | ${counts[sev]} |`)
  }
  lines.push(`| **Total** | **${findings.length}** |`)
  lines.push('')

  if (findings.length === 0) {
    lines.push('> ✅ No dangerous changes detected.')
    lines.push('')
    return lines.join('\n')
  }

  // Findings grouped by severity
  lines.push('## Findings')
  lines.push('')

  const groups = groupBySeverity(findings)
  for (const [severity, severityFindings] of groups) {
    lines.push(`### ${capitalize(severity)}`)
    lines.push('')

    for (const finding of severityFindings) {
      lines.push(`#### ${finding.id}: ${finding.title}`)
      lines.push('')
      lines.push(`**File:** \`${finding.file}\``)
      lines.push('')

      // Evidence as blockquote
      if (finding.evidence.length > 0) {
        lines.push('**Evidence:**')
        lines.push('')
        for (const e of finding.evidence) {
          lines.push(`> ${e}`)
        }
        lines.push('')
      }

      // Why
      lines.push(`**Why:** ${finding.why}`)
      lines.push('')

      // Review checklist
      lines.push('**Review:**')
      lines.push('')
      for (const r of finding.review) {
        lines.push(`- [ ] ${r}`)
      }
      lines.push('')

      // Test checklist
      lines.push('**Test:**')
      lines.push('')
      for (const t of finding.test) {
        lines.push(`- [ ] ${t}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
