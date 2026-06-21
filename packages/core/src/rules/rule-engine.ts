/**
 * VibeGuard rule engine.
 *
 * Runs a set of rules against a set of diff files, producing findings.
 * Rules are matched to files using glob patterns, and findings are
 * sorted by severity then by original file order.
 */

import type { DiffFile } from '../diff/hunk-model.js'
import type { Finding, Severity } from '../findings/finding.js'
import { severityRank } from '../findings/finding.js'
import type { Rule } from './define-rule.js'

/**
 * Run all matching rules against each file and return a flat, sorted Finding array.
 *
 * - Runs all rules whose glob patterns match a file's path.
 * - Does not mutate the input DiffFile objects.
 * - Sorts findings by severity (critical > high > medium > low),
 *   then by original file order within the same severity.
 * - Allows multiple or zero findings per file.
 */
export function runRules(files: DiffFile[], rules: Rule[]): Finding[] {
  const findings: Finding[] = []

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex]

    for (const rule of rules) {
      if (!matchesAnyGlob(file.path, rule.match)) {
        continue
      }

      const ruleFindings = rule.analyze(file)
      for (const finding of ruleFindings) {
        findings.push({
          ...finding,
          // Ensure file path is consistent with the matched file
          file: finding.file || file.path,
        })
      }
    }
  }

  // Sort by severity rank, preserving insertion order (file order) within same severity
  findings.sort((a, b) => {
    return severityRank[a.severity] - severityRank[b.severity]
  })

  return findings
}

/**
 * Check if a file path matches any of the given glob patterns.
 */
function matchesAnyGlob(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchGlob(filePath, pattern))
}

/**
 * Minimal glob matching supporting:
 * - `*` matches any characters except `/`
 * - `**` matches any characters including `/` (across path segments)
 * - `?` matches a single character except `/`
 * - Literal characters match themselves
 */
function matchGlob(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexStr = '^'
  let i = 0

  while (i < pattern.length) {
    const char = pattern[i]

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        // `**` — match anything including `/`
        if (pattern[i + 2] === '/') {
          // `**/` — match zero or more path segments
          regexStr += '(?:.+/)?'
          i += 3
        } else {
          // `**` at end or standalone
          regexStr += '.*'
          i += 2
        }
      } else {
        // `*` — match anything except `/`
        regexStr += '[^/]*'
        i++
      }
    } else if (char === '?') {
      regexStr += '[^/]'
      i++
    } else if ('.+^${}()|[]\\'.includes(char)) {
      // Escape regex special characters
      regexStr += '\\' + char
      i++
    } else {
      regexStr += char
      i++
    }
  }

  regexStr += '$'

  try {
    const regex = new RegExp(regexStr)
    return regex.test(filePath)
  } catch {
    // If regex construction fails, fall back to exact match
    return filePath === pattern
  }
}
