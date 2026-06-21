import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseUnifiedDiff, runRules } from '@vibeguard/core'
import { vgAuth002 } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readFixture(name: string): string {
  return readFileSync(join(__dirname, name), 'utf-8')
}

describe('VG-AUTH-002', () => {
  const rules = [vgAuth002]

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
      expect(f.id).toBe('VG-AUTH-002')
      expect(f.severity).toBe('critical')
      expect(f.file).toBe('src/auth/cookies.ts')
      expect(f.title).toBe('Session cookie may now be readable by client-side JavaScript.')
      expect(f.evidence).toHaveLength(2)
      expect(f.evidence[0]).toContain('httpOnly: true')
      expect(f.evidence[1]).toContain('httpOnly: false')
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
    it('does not trigger when httpOnly stays true', () => {
      const diff = `diff --git a/auth.ts b/auth.ts
--- a/auth.ts
+++ b/auth.ts
@@ -1,4 +1,4 @@
 const cookie = {
-  path: '/old',
+  path: '/new',
   httpOnly: true,
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('does not trigger when httpOnly stays false', () => {
      const diff = `diff --git a/auth.ts b/auth.ts
--- a/auth.ts
+++ b/auth.ts
@@ -1,4 +1,4 @@
 const cookie = {
-  path: '/old',
+  path: '/new',
   httpOnly: false,
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('detects httpOnly change with different spacing', () => {
      const diff = `diff --git a/auth.ts b/auth.ts
--- a/auth.ts
+++ b/auth.ts
@@ -1,4 +1,4 @@
 const cookie = {
-  httpOnly:true,
+  httpOnly : false,
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].id).toBe('VG-AUTH-002')
    })

    it('does not trigger when changes are in different hunks', () => {
      const diff = `diff --git a/auth.ts b/auth.ts
--- a/auth.ts
+++ b/auth.ts
@@ -1,3 +1,3 @@
 const cookie = {
-  httpOnly: true,
+  httpOnly: true,
 }
@@ -10,3 +10,3 @@
 const other = {
-  someProp: 'old',
+  someProp: 'new',
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      // httpOnly: true is removed in hunk 1, but no httpOnly: false is added
      expect(findings).toHaveLength(0)
    })

    it('detects in deeply nested JS file', () => {
      const diff = `diff --git a/src/lib/auth/session.js b/src/lib/auth/session.js
--- a/src/lib/auth/session.js
+++ b/src/lib/auth/session.js
@@ -10,4 +10,4 @@
     secure: true,
-    httpOnly: true,
+    httpOnly: false,
     maxAge: 3600,
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].file).toBe('src/lib/auth/session.js')
    })
  })
})
