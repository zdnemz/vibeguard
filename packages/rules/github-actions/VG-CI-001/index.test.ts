import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseUnifiedDiff, runRules } from '@vibeguard/core'
import { vgCi001 } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readFixture(name: string): string {
  return readFileSync(join(__dirname, name), 'utf-8')
}

describe('VG-CI-001', () => {
  const rules = [vgCi001]

  describe('trigger.diff', () => {
    it('produces a critical finding matching expected.json', () => {
      const diff = readFixture('trigger.diff')
      const expected = JSON.parse(readFixture('expected.json'))

      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0]).toEqual(expected[0])
    })

    it('has the correct finding shape', () => {
      const diff = readFixture('trigger.diff')
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)

      const f = findings[0]
      expect(f.id).toBe('VG-CI-001')
      expect(f.severity).toBe('critical')
      expect(f.file).toBe('.github/workflows/ci.yml')
      expect(f.title).toBe('GitHub token permissions were expanded.')
      expect(f.evidence.length).toBeGreaterThan(0)
      expect(f.why).toBeTruthy()
      expect(f.review.length).toBeGreaterThan(0)
      expect(f.test.length).toBeGreaterThan(0)
    })
  })

  describe('non-trigger.diff', () => {
    it('produces zero findings', () => {
      const diff = readFixture('non-trigger.diff')
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('detects permissions: write-all', () => {
      const diff = `diff --git a/.github/workflows/deploy.yaml b/.github/workflows/deploy.yaml
--- a/.github/workflows/deploy.yaml
+++ b/.github/workflows/deploy.yaml
@@ -3,4 +3,4 @@ on: [push]
-permissions: read-all
+permissions: write-all
 jobs:
   deploy:`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].id).toBe('VG-CI-001')
      expect(findings[0].evidence[0]).toContain('permissions: write-all')
    })

    it('does not trigger when permissions stay read-only', () => {
      const diff = `diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -1,4 +1,4 @@
 name: CI
 permissions:
   contents: read
-  issues: write
+  issues: read`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('does not match non-workflow YAML files', () => {
      const diff = `diff --git a/config/settings.yml b/config/settings.yml
--- a/config/settings.yml
+++ b/config/settings.yml
@@ -1,3 +1,3 @@
 permissions:
-  contents: read
+  contents: write`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('matches .yaml extension', () => {
      const diff = `diff --git a/.github/workflows/release.yaml b/.github/workflows/release.yaml
--- a/.github/workflows/release.yaml
+++ b/.github/workflows/release.yaml
@@ -3,4 +3,4 @@
 permissions:
-  contents: read
+  contents: write`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].file).toBe('.github/workflows/release.yaml')
    })
  })
})
