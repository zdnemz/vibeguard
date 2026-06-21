/**
 * VG-CI-001 — GitHub Actions permission expanded
 *
 * Detects when GitHub Actions workflow permissions are expanded,
 * e.g. changing contents from read to write, or adding write-all permissions.
 */

import type { DiffFile, DiffHunk, DiffLine } from '@vibeguard/core'
import type { Finding, Rule } from '@vibeguard/core'

/**
 * Analyze a single hunk for permission expansion.
 * Detects:
 * 1. Removed 'contents: read' AND added 'contents: write' in same hunk
 * 2. Added line with 'permissions: write-all'
 */
function analyzeHunk(hunk: DiffHunk): Array<{ type: 'escalation' | 'write-all'; evidence: string[] }> {
  const results: Array<{ type: 'escalation' | 'write-all'; evidence: string[] }> = []

  const removedLines = hunk.lines.filter(
    (l): l is DiffLine & { type: 'removed' } => l.type === 'removed'
  )
  const addedLines = hunk.lines.filter(
    (l): l is DiffLine & { type: 'added' } => l.type === 'added'
  )

  // Check for contents: read -> contents: write escalation
  const hasContentsRead = removedLines.some(l => /contents\s*:\s*read/.test(l.content))
  const hasContentsWrite = addedLines.some(l => /contents\s*:\s*write/.test(l.content))

  if (hasContentsRead && hasContentsWrite) {
    const removedContent = removedLines.find(l => /contents\s*:\s*read/.test(l.content))!
    const addedContent = addedLines.find(l => /contents\s*:\s*write/.test(l.content))!
    results.push({
      type: 'escalation',
      evidence: [
        `Removed: ${removedContent.content.trim()}`,
        `Added: ${addedContent.content.trim()}`,
      ],
    })
  }

  // Check for permissions: write-all
  for (const added of addedLines) {
    if (/permissions\s*:\s*write-all/.test(added.content)) {
      results.push({
        type: 'write-all',
        evidence: [`Added: ${added.content.trim()}`],
      })
    }
  }

  return results
}

/**
 * Analyze a workflow file diff for permission expansion.
 */
function analyze(file: DiffFile): Finding[] {
  const findings: Finding[] = []

  for (const hunk of file.hunks) {
    const matches = analyzeHunk(hunk)

    for (const match of matches) {
      findings.push({
        id: 'VG-CI-001',
        severity: 'critical',
        file: file.path,
        title: 'GitHub token permissions were expanded.',
        evidence: match.evidence,
        why: 'Expanding GitHub Actions token permissions gives workflows broader access to the repository, increasing the blast radius of a compromised workflow.',
        review: [
          'Verify the permission change is intentional and required.',
          'Confirm the workflow follows the principle of least privilege.',
        ],
        test: [
          'Run the workflow and verify it completes with the original read-only permissions.',
          'Audit all GITHUB_TOKEN usages in the workflow for write operations.',
        ],
      })
    }
  }

  return findings
}

export const vgCi001: Rule = {
  id: 'VG-CI-001',
  severity: 'critical',
  preset: 'nextjs-app-router',
  match: ['.github/workflows/*.yml', '.github/workflows/*.yaml'],
  analyze,
}
