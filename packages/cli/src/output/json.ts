/**
 * VibeGuard JSON output formatter.
 *
 * Produces a stable, machine-readable JSON report of findings.
 * No ANSI colors. 2-space indent. Keys in a fixed order.
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

/**
 * Format findings as a JSON string.
 *
 * Output shape:
 * {
 *   preset: string,
 *   summary: { total, critical, high, medium, low },
 *   findings: Finding[]
 * }
 */
export function formatJSON(preset: string, findings: Finding[]): string {
  const counts = countBySeverity(findings)

  const report = {
    preset,
    summary: {
      total: findings.length,
      critical: counts.critical,
      high: counts.high,
      medium: counts.medium,
      low: counts.low,
    },
    findings,
  }

  return JSON.stringify(report, null, 2)
}
