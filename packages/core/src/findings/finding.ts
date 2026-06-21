/**
 * VibeGuard finding model.
 *
 * Findings are the output of rule analysis. Each finding represents
 * a potentially dangerous change detected in a diff.
 *
 * Rules:
 * - No score, no numeric ranking — severity only.
 * - evidence must not be empty for critical or high findings.
 * - review and test must contain actionable strings.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low'

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

/**
 * Severity rank for sorting. Lower number = higher priority.
 */
export const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const

/**
 * Validate a Finding object against the spec rules.
 * Throws if the finding is invalid.
 */
export function validateFinding(finding: Finding): void {
  if (!finding.id || typeof finding.id !== 'string') {
    throw new Error('Finding must have a non-empty string id')
  }
  if (!finding.severity || !['critical', 'high', 'medium', 'low'].includes(finding.severity)) {
    throw new Error(`Invalid severity: ${finding.severity}`)
  }
  if (!finding.file || typeof finding.file !== 'string') {
    throw new Error('Finding must have a non-empty string file')
  }
  if (!finding.title || typeof finding.title !== 'string') {
    throw new Error('Finding must have a non-empty string title')
  }
  if (!Array.isArray(finding.evidence)) {
    throw new Error('Finding evidence must be an array')
  }
  if ((finding.severity === 'critical' || finding.severity === 'high') && finding.evidence.length === 0) {
    throw new Error(`Finding with severity ${finding.severity} must have non-empty evidence`)
  }
  if (!Array.isArray(finding.review) || finding.review.length === 0) {
    throw new Error('Finding review must be a non-empty array of actionable strings')
  }
  if (!Array.isArray(finding.test) || finding.test.length === 0) {
    throw new Error('Finding test must be a non-empty array of actionable strings')
  }
  if (typeof finding.why !== 'string' || finding.why.length === 0) {
    throw new Error('Finding why must be a non-empty string')
  }
}
