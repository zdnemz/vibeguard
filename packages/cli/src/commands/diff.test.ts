/**
 * Integration tests for the CLI diff command.
 *
 * These tests verify the full pipeline: diff → parse → rules → output.
 * They use fixture diffs rather than actual git operations.
 */

import { describe, it, expect } from 'vitest'
import { parseUnifiedDiff, runRules, buildNextjsAppRouterPreset } from '@vibeguard/core'
import { vgAuth001, vgAuth002, vgCi001, vgDep001, vgAgent003 } from '@vibeguard/rules'
import { formatTerminal } from '../output/terminal.js'
import { formatJSON } from '../output/json.js'
import { formatMarkdown } from '../output/markdown.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Load all rules for the nextjs-app-router preset */
function getAllRules() {
  return buildNextjsAppRouterPreset([vgAuth001, vgAuth002, vgCi001, vgDep001, vgAgent003])
}

describe('CLI diff integration', () => {
  describe('full pipeline with trigger fixtures', () => {
    it('detects VG-AUTH-001 from trigger.diff', () => {
      const fixturePath = resolve(__dirname, '../../../rules/nextjs-app-router/VG-AUTH-001/trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].id).toBe('VG-AUTH-001')
      expect(findings[0].severity).toBe('critical')
    })

    it('produces no findings from VG-AUTH-001 non-trigger.diff', () => {
      const fixturePath = resolve(__dirname, '../../../rules/nextjs-app-router/VG-AUTH-001/non-trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      const auth001Findings = findings.filter(f => f.id === 'VG-AUTH-001')
      expect(auth001Findings.length).toBe(0)
    })

    it('detects VG-CI-001 from trigger.diff', () => {
      const fixturePath = resolve(__dirname, '../../../rules/github-actions/VG-CI-001/trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings.some(f => f.id === 'VG-CI-001')).toBe(true)
    })

    it('detects VG-DEP-001 from trigger.diff', () => {
      const fixturePath = resolve(__dirname, '../../../rules/dependencies/VG-DEP-001/trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings.some(f => f.id === 'VG-DEP-001')).toBe(true)
    })

    it('detects VG-AGENT-003 from trigger.diff', () => {
      const fixturePath = resolve(__dirname, '../../../rules/agent-config/VG-AGENT-003/trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings.some(f => f.id === 'VG-AGENT-003')).toBe(true)
    })
  })

  describe('output formatters', () => {
    it('terminal output contains expected structure', () => {
      const fixturePath = resolve(__dirname, '../../../rules/nextjs-app-router/VG-AUTH-001/trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      const output = formatTerminal(findings, 'nextjs-app-router')
      expect(output).toContain('VibeGuard')
      expect(output).toContain('VG-AUTH-001')
      expect(output).toContain('Evidence:')
      expect(output).toContain('Why it matters:')
      expect(output).toContain('Suggested review:')
      expect(output).toContain('Suggested test:')
    })

    it('JSON output is valid and has stable structure', () => {
      const fixturePath = resolve(__dirname, '../../../rules/nextjs-app-router/VG-AUTH-001/trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      const output = formatJSON('nextjs-app-router', findings)
      const parsed = JSON.parse(output)

      expect(parsed.preset).toBe('nextjs-app-router')
      expect(parsed.summary).toBeDefined()
      expect(parsed.summary.total).toBeGreaterThan(0)
      expect(parsed.summary.critical).toBeGreaterThan(0)
      expect(parsed.findings).toBeInstanceOf(Array)
      expect(parsed.findings[0].id).toBe('VG-AUTH-001')
    })

    it('markdown output has expected structure', () => {
      const fixturePath = resolve(__dirname, '../../../rules/nextjs-app-router/VG-AUTH-001/trigger.diff')
      const diff = readFileSync(fixturePath, 'utf-8')
      const files = parseUnifiedDiff(diff)
      const preset = getAllRules()
      const findings = runRules(files, preset.rules)

      const output = formatMarkdown('nextjs-app-router', findings)
      expect(output).toContain('# VibeGuard Report')
      expect(output).toContain('## Summary')
      expect(output).toContain('## Findings')
      expect(output).toContain('VG-AUTH-001')
    })

    it('empty findings produce correct no-results message', () => {
      const terminalOutput = formatTerminal([], 'nextjs-app-router')
      expect(terminalOutput).toContain('no dangerous changes')

      const jsonOutput = formatJSON('nextjs-app-router', [])
      const parsed = JSON.parse(jsonOutput)
      expect(parsed.summary.total).toBe(0)
      expect(parsed.findings).toEqual([])

      const markdownOutput = formatMarkdown('nextjs-app-router', [])
      expect(markdownOutput).toContain('No dangerous changes detected')
    })
  })
})
