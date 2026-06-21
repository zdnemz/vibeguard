/**
 * VibeGuard GitHub Action entry point.
 *
 * Reads VibeGuard JSON output, produces a Markdown step summary,
 * sets output variables, and optionally fails the build.
 *
 * Inputs (via GitHub Action inputs / env vars):
 *   INPUT_PRESET     — rule preset name (default: 'nextjs-app-router')
 *   INPUT_COMMENT_ON — minimum severity to comment (default: 'high')
 *   INPUT_FAIL_ON    — minimum severity to fail   (default: 'never')
 *
 * Outputs (written to GITHUB_OUTPUT):
 *   findings-count — total number of findings
 *   has-critical   — 'true' | 'false'
 *   has-high       — 'true' | 'false'
 */

import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { exit } from 'node:process'
import type { Finding, Severity } from '@vibeguard/core'
import { severityRank } from '@vibeguard/core'

/** Shape of the VibeGuard JSON report */
type VibeGuardReport = {
  preset: string
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
  findings: Finding[]
}

/** Read a GitHub Action input from environment */
function getInput(name: string, defaultValue: string): string {
  const envKey = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`
  return process.env[envKey]?.trim() || defaultValue
}

/** Write an output variable to GITHUB_OUTPUT */
function setOutput(name: string, value: string): void {
  const outputFile = process.env['GITHUB_OUTPUT']
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`)
  }
}

/** Write to the GitHub Actions step summary */
function writeStepSummary(markdown: string): void {
  const summaryFile = process.env['GITHUB_STEP_SUMMARY']
  if (summaryFile) {
    appendFileSync(summaryFile, markdown + '\n')
  }
}

/** Capitalize first letter */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Generate Markdown summary from a VibeGuard report.
 */
function generateSummaryMarkdown(report: VibeGuardReport): string {
  const { preset, summary, findings } = report
  const lines: string[] = []

  lines.push('# 🛡️ VibeGuard Report')
  lines.push('')
  lines.push(`**Preset:** ${preset}`)
  lines.push('')

  if (summary.total === 0) {
    lines.push('> ✅ No dangerous changes detected.')
    lines.push('')
    return lines.join('\n')
  }

  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Severity | Count |')
  lines.push('|----------|-------|')
  for (const sev of ['critical', 'high', 'medium', 'low'] as Severity[]) {
    lines.push(`| ${capitalize(sev)} | ${summary[sev]} |`)
  }
  lines.push(`| **Total** | **${summary.total}** |`)
  lines.push('')

  // Findings
  lines.push('## Findings')
  lines.push('')

  for (const finding of findings) {
    lines.push(`### ${finding.id}: ${finding.title}`)
    lines.push('')
    lines.push(`- **Severity:** ${finding.severity}`)
    lines.push(`- **File:** \`${finding.file}\``)
    lines.push(`- **Why:** ${finding.why}`)
    lines.push('')

    if (finding.evidence.length > 0) {
      lines.push('**Evidence:**')
      lines.push('')
      for (const e of finding.evidence) {
        lines.push(`> ${e}`)
      }
      lines.push('')
    }

    lines.push('**Review:**')
    lines.push('')
    for (const r of finding.review) {
      lines.push(`- [ ] ${r}`)
    }
    lines.push('')

    lines.push('**Test:**')
    lines.push('')
    for (const t of finding.test) {
      lines.push(`- [ ] ${t}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Determine if the action should fail based on findings and fail-on input.
 */
function shouldFail(findings: Finding[], failOn: string): boolean {
  if (failOn === 'never') return false

  const threshold = failOn as Severity
  if (!severityRank[threshold] && threshold !== undefined) {
    // Invalid fail-on value, don't fail
    return false
  }

  const thresholdRank = severityRank[threshold]
  return findings.some(f => severityRank[f.severity] <= thresholdRank)
}

/**
 * Determine if a comment should be posted based on findings and comment-on input.
 */
function shouldComment(findings: Finding[], commentOn: string): boolean {
  const threshold = commentOn as Severity
  if (severityRank[threshold] === undefined) {
    return false
  }

  const thresholdRank = severityRank[threshold]
  return findings.some(f => severityRank[f.severity] <= thresholdRank)
}

/**
 * Main entry point for the GitHub Action.
 */
export async function run(): Promise<void> {
  const _preset = getInput('preset', 'nextjs-app-router')
  const commentOn = getInput('comment-on', 'high')
  const failOn = getInput('fail-on', 'never')

  // Read VibeGuard JSON output
  const jsonPath = process.env['VIBEGUARD_JSON'] || 'vibeguard-report.json'

  if (!existsSync(jsonPath)) {
    console.log(`VibeGuard report not found at ${jsonPath}. Skipping.`)
    setOutput('findings-count', '0')
    setOutput('has-critical', 'false')
    setOutput('has-high', 'false')
    return
  }

  let report: VibeGuardReport
  try {
    const raw = readFileSync(jsonPath, 'utf-8')
    report = JSON.parse(raw) as VibeGuardReport
  } catch (err) {
    console.error(`Failed to parse VibeGuard report: ${err}`)
    exit(1)
  }

  const findings = report.findings

  // Set output variables
  setOutput('findings-count', String(report.summary.total))
  setOutput('has-critical', String(report.summary.critical > 0))
  setOutput('has-high', String(report.summary.high > 0))

  // Generate and write step summary
  const markdown = generateSummaryMarkdown(report)
  writeStepSummary(markdown)

  // Log summary to console
  console.log(`VibeGuard found ${report.summary.total} finding(s).`)
  if (report.summary.total > 0) {
    console.log(`  Critical: ${report.summary.critical}`)
    console.log(`  High: ${report.summary.high}`)
    console.log(`  Medium: ${report.summary.medium}`)
    console.log(`  Low: ${report.summary.low}`)
  }

  // Check if we should comment
  if (shouldComment(findings, commentOn)) {
    console.log(`Findings meet comment threshold (comment-on: ${commentOn}).`)
  }

  // Check if we should fail
  if (shouldFail(findings, failOn)) {
    console.error(`VibeGuard: Findings meet fail threshold (fail-on: ${failOn}). Failing.`)
    exit(1)
  }
}

// Re-export for testing
export { generateSummaryMarkdown, shouldFail, shouldComment }

// Run when executed directly
run().catch((err) => {
  console.error(err)
  exit(1)
})
