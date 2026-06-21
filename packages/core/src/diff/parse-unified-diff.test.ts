import { describe, it, expect } from 'vitest'
import { parseUnifiedDiff } from './parse-unified-diff.js'

describe('parseUnifiedDiff', () => {
  it('parses a modified file with one hunk', () => {
    const diff = `\
diff --git a/middleware.ts b/middleware.ts
index 1234567..abcdefg 100644
--- a/middleware.ts
+++ b/middleware.ts
@@ -5,7 +5,7 @@
 export const config = {
   matcher: [
     '/api/:path*',
-    '/dashboard/:path*',
+    '/dashboard',
     '/settings/:path*',
   ],
 }`

    const files = parseUnifiedDiff(diff)

    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('middleware.ts')
    expect(files[0].hunks).toHaveLength(1)

    const hunk = files[0].hunks[0]
    expect(hunk.oldStart).toBe(5)
    expect(hunk.oldLines).toBe(7)
    expect(hunk.newStart).toBe(5)
    expect(hunk.newLines).toBe(7)
    expect(hunk.lines).toHaveLength(8) // 6 context + 1 removed + 1 added

    // Check the removed line
    const removed = hunk.lines.find(l => l.type === 'removed')
    expect(removed).toBeDefined()
    expect(removed!.content).toBe("    '/dashboard/:path*',")
    expect(removed!.oldLine).toBe(8)
    expect(removed!.newLine).toBeUndefined()

    // Check the added line
    const added = hunk.lines.find(l => l.type === 'added')
    expect(added).toBeDefined()
    expect(added!.content).toBe("    '/dashboard',")
    expect(added!.newLine).toBe(8)
    expect(added!.oldLine).toBeUndefined()
  })

  it('parses a modified file with multiple hunks', () => {
    const diff = `\
diff --git a/src/auth.ts b/src/auth.ts
index 1111111..2222222 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,3 +1,3 @@
 import { verify } from 'crypto'
-export const SECRET = 'old'
+export const SECRET = 'new'
 export function check() {}
@@ -20,3 +20,4 @@
 export function login() {
-  return false
+  return true
+  // added line
 }`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].hunks).toHaveLength(2)

    // First hunk: 2 context + 1 removed + 1 added = 4
    expect(files[0].hunks[0].oldStart).toBe(1)
    expect(files[0].hunks[0].lines).toHaveLength(4)

    // Second hunk: 2 context + 1 removed + 2 added = 5
    expect(files[0].hunks[1].oldStart).toBe(20)
    expect(files[0].hunks[1].lines).toHaveLength(5)
  })

  it('parses an added file', () => {
    const diff = `\
diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+export function hello() {
+  return 'world'
+}`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('new-file.ts')
    expect(files[0].hunks).toHaveLength(1)

    const hunk = files[0].hunks[0]
    expect(hunk.oldStart).toBe(0)
    expect(hunk.oldLines).toBe(0)
    expect(hunk.newStart).toBe(1)
    expect(hunk.newLines).toBe(3)
    expect(hunk.lines).toHaveLength(3)
    expect(hunk.lines.every(l => l.type === 'added')).toBe(true)
  })

  it('parses a deleted file', () => {
    const diff = `\
diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index 1234567..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function goodbye() {
-  return 'world'
-}`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(1)
    // When file is deleted, path should be the old path
    expect(files[0].path).toBe('/dev/null')
    expect(files[0].oldPath).toBe('old-file.ts')
    expect(files[0].hunks).toHaveLength(1)

    const hunk = files[0].hunks[0]
    expect(hunk.lines).toHaveLength(3)
    expect(hunk.lines.every(l => l.type === 'removed')).toBe(true)
  })

  it('parses multiple files in one diff', () => {
    const diff = `\
diff --git a/file1.ts b/file1.ts
index 1111111..2222222 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,2 +1,2 @@
-export const A = 1
+export const A = 2
 export const B = 3
diff --git a/file2.ts b/file2.ts
index 3333333..4444444 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1,2 +1,3 @@
 export const X = 10
+export const Y = 20
 export const Z = 30`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(2)
    expect(files[0].path).toBe('file1.ts')
    expect(files[1].path).toBe('file2.ts')
    expect(files[0].hunks[0].lines).toHaveLength(3) // 1 removed + 1 added + 1 context
    expect(files[1].hunks[0].lines).toHaveLength(3) // 2 context + 1 added
  })

  it('tracks old/new line numbers correctly', () => {
    const diff = `\
diff --git a/example.ts b/example.ts
--- a/example.ts
+++ b/example.ts
@@ -10,5 +10,6 @@
 const a = 1
-const b = 2
+const b = 3
+const c = 4
 const d = 5
 const e = 6
 const f = 7`

    const files = parseUnifiedDiff(diff)
    const hunk = files[0].hunks[0]

    // Context line: line 10 old, line 10 new
    expect(hunk.lines[0]).toEqual({ type: 'context', content: 'const a = 1', oldLine: 10, newLine: 10 })

    // Removed line: line 11 old, no new line
    expect(hunk.lines[1]).toEqual({ type: 'removed', content: 'const b = 2', oldLine: 11, newLine: undefined })

    // Added lines: no old line, line 11 and 12 new
    expect(hunk.lines[2]).toEqual({ type: 'added', content: 'const b = 3', oldLine: undefined, newLine: 11 })
    expect(hunk.lines[3]).toEqual({ type: 'added', content: 'const c = 4', oldLine: undefined, newLine: 12 })

    // Context lines continue
    expect(hunk.lines[4]).toEqual({ type: 'context', content: 'const d = 5', oldLine: 12, newLine: 13 })
    expect(hunk.lines[5]).toEqual({ type: 'context', content: 'const e = 6', oldLine: 13, newLine: 14 })
    expect(hunk.lines[6]).toEqual({ type: 'context', content: 'const f = 7', oldLine: 14, newLine: 15 })
  })

  it('strips only the diff prefix marker, not user content', () => {
    const diff = `\
diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,3 @@
-const x = "-- not a diff marker"
+const x = "++ also not a diff marker"
 const y = "  preserved spaces  "
 const z = 1`

    const files = parseUnifiedDiff(diff)
    const hunk = files[0].hunks[0]

    expect(hunk.lines[0].content).toBe('const x = "-- not a diff marker"')
    expect(hunk.lines[1].content).toBe('const x = "++ also not a diff marker"')
    expect(hunk.lines[2].content).toBe('const y = "  preserved spaces  "')
  })

  it('ignores metadata lines (index, ---, +++, diff --git)', () => {
    const diff = `\
diff --git a/file.ts b/file.ts
index abcdef1..1234567 100644
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,2 @@
-old
+new
 context`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(1)

    // The metadata lines should not appear in hunk content
    const allContent = files[0].hunks[0].lines.map(l => l.content)
    expect(allContent).not.toContain('index abcdef1..1234567 100644')
    expect(allContent).not.toContain('a/file.ts')
    expect(allContent).not.toContain('b/file.ts')
  })

  it('tolerates "\\ No newline at end of file"', () => {
    const diff = `\
diff --git a/no-newline.ts b/no-newline.ts
--- a/no-newline.ts
+++ b/no-newline.ts
@@ -1,3 +1,3 @@
 line1
-old-last-line
+new-last-line
\\ No newline at end of file`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(1)

    const hunk = files[0].hunks[0]
    // Should have 3 lines: context, removed, added (no-newline marker ignored)
    expect(hunk.lines).toHaveLength(3)
    expect(hunk.lines[0].type).toBe('context')
    expect(hunk.lines[1].type).toBe('removed')
    expect(hunk.lines[2].type).toBe('added')
  })

  it('preserves line order within hunks', () => {
    const diff = `\
diff --git a/ordered.ts b/ordered.ts
--- a/ordered.ts
+++ b/ordered.ts
@@ -1,6 +1,6 @@
 context-1
-removed-2
+added-2
 context-3
 context-4
-removed-5
+added-5
 context-6`

    const files = parseUnifiedDiff(diff)
    const types = files[0].hunks[0].lines.map(l => l.type)
    expect(types).toEqual(['context', 'removed', 'added', 'context', 'context', 'removed', 'added', 'context'])
  })

  it('returns empty array for empty input', () => {
    expect(parseUnifiedDiff('')).toEqual([])
  })

  it('returns empty array for non-diff input', () => {
    expect(parseUnifiedDiff('This is just some random text\nwith no diff markers')).toEqual([])
  })

  it('handles hunk header without line count (single line hunk)', () => {
    const diff = `\
diff --git a/single.ts b/single.ts
--- a/single.ts
+++ b/single.ts
@@ -1 +1 @@
-old
+new`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(1)
    const hunk = files[0].hunks[0]
    expect(hunk.oldStart).toBe(1)
    expect(hunk.oldLines).toBe(1)
    expect(hunk.newStart).toBe(1)
    expect(hunk.newLines).toBe(1)
    expect(hunk.lines).toHaveLength(2)
  })

  it('handles rename (oldPath differs from path)', () => {
    const diff = `\
diff --git a/old-name.ts b/new-name.ts
similarity index 90%
rename from old-name.ts
rename to new-name.ts
--- a/old-name.ts
+++ b/new-name.ts
@@ -1,3 +1,3 @@
 const a = 1
-const b = 2
+const b = 3
 const c = 4`

    const files = parseUnifiedDiff(diff)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('new-name.ts')
    expect(files[0].oldPath).toBe('old-name.ts')
  })

  it('parses the VG-AUTH-001 trigger diff correctly', () => {
    const diff = `\
diff --git a/middleware.ts b/middleware.ts
index a1b2c3d..e4f5g6h 100644
--- a/middleware.ts
+++ b/middleware.ts
@@ -3,7 +3,7 @@ import { NextResponse } from 'next/server'
 
 export const config = {
   matcher: [
-    '/dashboard/:path*',
+    '/dashboard',
     '/settings/:path*',
     '/admin/:path*',
   ],
 }`

    const files = parseUnifiedDiff(diff)

    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('middleware.ts')
    expect(files[0].hunks).toHaveLength(1)

    const hunk = files[0].hunks[0]
    expect(hunk.oldStart).toBe(3)
    expect(hunk.oldLines).toBe(7)
    expect(hunk.newStart).toBe(3)
    expect(hunk.newLines).toBe(7)

    const removed = hunk.lines.find(l => l.type === 'removed')
    expect(removed).toBeDefined()
    expect(removed!.content).toContain('/dashboard/:path*')
    expect(removed!.oldLine).toBeDefined()

    const added = hunk.lines.find(l => l.type === 'added')
    expect(added).toBeDefined()
    expect(added!.content).toContain('/dashboard')
    expect(added!.newLine).toBeDefined()
  })
})
