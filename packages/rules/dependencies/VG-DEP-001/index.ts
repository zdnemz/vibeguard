/**
 * VG-DEP-001 — Remote shell execution added to package script
 *
 * Detects when a package.json diff adds scripts that pipe remote
 * content to a shell, or use eval(), which can execute arbitrary code.
 */

import type { DiffFile, DiffHunk, DiffLine } from '@vibeguard/core'
import type { Finding, Rule } from '@vibeguard/core'

/**
 * Check if a line contains a dangerous remote shell pattern:
 * - 'curl' AND '|' AND ('bash' OR 'sh')
 * - 'wget' AND '|'
 * - 'eval('
 */
function isDangerousScript(content: string): boolean {
  const lower = content.toLowerCase()

  // curl | bash or curl | sh
  if (lower.includes('curl') && lower.includes('|') && (lower.includes('bash') || lower.includes('sh'))) {
    return true
  }

  // wget |
  if (lower.includes('wget') && lower.includes('|')) {
    return true
  }

  // eval(
  if (lower.includes('eval(')) {
    return true
  }

  return false
}

/**
 * Analyze a single hunk for dangerous script additions.
 */
function analyzeHunk(hunk: DiffHunk): DiffLine[] {
  return hunk.lines.filter(
    (l): l is DiffLine & { type: 'added' } => l.type === 'added' && isDangerousScript(l.content)
  )
}

/**
 * Analyze a package.json diff for dangerous script additions.
 */
function analyze(file: DiffFile): Finding[] {
  const findings: Finding[] = []

  for (const hunk of file.hunks) {
    const dangerousLines = analyzeHunk(hunk)

    if (dangerousLines.length > 0) {
      findings.push({
        id: 'VG-DEP-001',
        severity: 'critical',
        file: file.path,
        title: 'Package script added remote or dynamic code execution.',
        evidence: dangerousLines.map(l => `Added: ${l.content.trim()}`),
        why: 'Scripts that pipe remote content to a shell or use eval() can execute arbitrary code, creating a supply chain attack vector.',
        review: [
          'Verify the script source is trusted and pinned to a specific version.',
          'Replace curl|bash patterns with verified package manager installs.',
        ],
        test: [
          'Run the script in an isolated environment and inspect network requests.',
          'Verify no unexpected code is executed beyond the intended operation.',
        ],
      })
    }
  }

  return findings
}

export const vgDep001: Rule = {
  id: 'VG-DEP-001',
  severity: 'critical',
  preset: 'nextjs-app-router',
  match: ['package.json'],
  analyze,
}
