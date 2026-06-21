import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseUnifiedDiff, runRules } from '@vibeguard/core'
import { vgAuth001 } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readFixture(name: string): string {
  return readFileSync(join(__dirname, name), 'utf-8')
}

describe('VG-AUTH-001', () => {
  const rules = [vgAuth001]

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
      expect(f.id).toBe('VG-AUTH-001')
      expect(f.severity).toBe('critical')
      expect(f.file).toBe('middleware.ts')
      expect(f.title).toBe('Route protection may have been weakened.')
      expect(f.evidence).toHaveLength(1)
      expect(f.evidence[0]).toContain('/dashboard/:path*')
      expect(f.evidence[0]).toContain('/dashboard')
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
    it('detects narrowing on different route paths', () => {
      const diff = `diff --git a/middleware.ts b/middleware.ts
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,4 +1,4 @@
 export const config = {
   matcher: [
-    '/api/:path*',
+    '/api',
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].id).toBe('VG-AUTH-001')
      expect(findings[0].evidence[0]).toContain('/api/:path*')
      expect(findings[0].evidence[0]).toContain('/api')
    })

    it('detects multiple matcher narrowings in the same hunk', () => {
      const diff = `diff --git a/middleware.ts b/middleware.ts
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,6 +1,6 @@
 export const config = {
   matcher: [
-    '/dashboard/:path*',
+    '/dashboard',
-    '/admin/:path*',
+    '/admin',
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(2)
      expect(findings[0].evidence[0]).toContain('/dashboard')
      expect(findings[1].evidence[0]).toContain('/admin')
    })

    it('does not trigger when widening (adding :path*)', () => {
      const diff = `diff --git a/middleware.ts b/middleware.ts
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,4 +1,4 @@
 export const config = {
   matcher: [
-    '/dashboard',
+    '/dashboard/:path*',
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('does not trigger when both old and new have :path*', () => {
      const diff = `diff --git a/middleware.ts b/middleware.ts
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,4 +1,4 @@
 export const config = {
   matcher: [
-    '/dashboard/:path*',
+    '/admin/:path*',
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('does not trigger when routes are completely different', () => {
      const diff = `diff --git a/middleware.ts b/middleware.ts
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,4 +1,4 @@
 export const config = {
   matcher: [
-    '/dashboard/:path*',
+    '/settings',
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('does not trigger on non-matcher route changes', () => {
      const diff = `diff --git a/middleware.ts b/middleware.ts
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,4 +1,4 @@
 export async function middleware(request: NextRequest) {
-  const url = '/dashboard/:path*'
+  const url = '/dashboard'
   return NextResponse.next()
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      // This WILL trigger because the detection looks for quoted route patterns
      // regardless of context. The rule matches on the pattern, not on AST.
      // For v0, this is acceptable — it's better to over-detect than miss.
      expect(findings).toHaveLength(1)
    })

    it('matches src/middleware.ts path', () => {
      const diff = `diff --git a/src/middleware.ts b/src/middleware.ts
--- a/src/middleware.ts
+++ b/src/middleware.ts
@@ -1,4 +1,4 @@
 export const config = {
   matcher: [
-    '/dashboard/:path*',
+    '/dashboard',
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].file).toBe('src/middleware.ts')
    })

    it('does not match files not named middleware.ts', () => {
      const diff = `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,4 +1,4 @@
 export const config = {
   matcher: [
-    '/dashboard/:path*',
+    '/dashboard',
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(0)
    })

    it('handles double-quoted route patterns', () => {
      const diff = `diff --git a/middleware.ts b/middleware.ts
--- a/middleware.ts
+++ b/middleware.ts
@@ -1,4 +1,4 @@
 export const config = {
   matcher: [
-    "/dashboard/:path*",
+    "/dashboard",
   ],
 }`
      const files = parseUnifiedDiff(diff)
      const findings = runRules(files, rules)

      expect(findings).toHaveLength(1)
      expect(findings[0].evidence[0]).toContain('/dashboard/:path*')
    })
  })
})
