/**
 * VG-AUTH-002 — Cookie httpOnly removed
 *
 * Detects when a cookie configuration changes from httpOnly: true to
 * httpOnly: false within the same hunk, which exposes the session
 * cookie to client-side JavaScript (XSS risk).
 */

import type { DiffFile, DiffHunk, DiffLine } from '@vibeguard/core'
import type { Finding, Rule } from '@vibeguard/core'

/**
 * Check if a line contains httpOnly set to the given boolean value.
 */
function hasHttpOnly(line: DiffLine, value: boolean): boolean {
  const pattern = value
    ? /httpOnly\s*:\s*true/
    : /httpOnly\s*:\s*false/
  return pattern.test(line.content)
}

/**
 * Analyze a single hunk for httpOnly removal.
 * Looks for a removed line with httpOnly: true and an added line with httpOnly: false.
 */
function analyzeHunk(hunk: DiffHunk): Array<{ removed: DiffLine; added: DiffLine }> {
  const matches: Array<{ removed: DiffLine; added: DiffLine }> = []

  const removedLines = hunk.lines.filter(
    (l): l is DiffLine & { type: 'removed' } => l.type === 'removed' && hasHttpOnly(l, true)
  )

  const addedLines = hunk.lines.filter(
    (l): l is DiffLine & { type: 'added' } => l.type === 'added' && hasHttpOnly(l, false)
  )

  for (const removed of removedLines) {
    for (const added of addedLines) {
      matches.push({ removed, added })
    }
  }

  return matches
}

/**
 * Analyze a file diff for httpOnly cookie removal.
 */
function analyze(file: DiffFile): Finding[] {
  const findings: Finding[] = []

  for (const hunk of file.hunks) {
    const matches = analyzeHunk(hunk)

    for (const { removed, added } of matches) {
      findings.push({
        id: 'VG-AUTH-002',
        severity: 'critical',
        file: file.path,
        title: 'Session cookie may now be readable by client-side JavaScript.',
        evidence: [
          `Removed: ${removed.content.trim()}`,
          `Added: ${added.content.trim()}`,
        ],
        why: 'Removing httpOnly from a session cookie allows client-side JavaScript to read it, enabling session theft via XSS attacks.',
        review: [
          'Verify no client-side code needs to read the session cookie.',
          'Confirm httpOnly: true is restored.',
        ],
        test: [
          'Set a cookie and check document.cookie does not contain it.',
          'Expected: session cookie absent from document.cookie.',
        ],
      })
    }
  }

  return findings
}

export const vgAuth002: Rule = {
  id: 'VG-AUTH-002',
  severity: 'critical',
  preset: 'nextjs-app-router',
  match: ['**/*.ts', '**/*.js'],
  analyze,
}
