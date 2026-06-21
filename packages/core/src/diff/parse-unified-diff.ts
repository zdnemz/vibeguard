/**
 * VibeGuard unified diff parser.
 *
 * Parses a unified diff string into an array of DiffFile objects.
 * Handles modified, added, and deleted files, multiple hunks per file,
 * and tolerates "\ No newline at end of file" markers.
 */

import type { DiffFile, DiffHunk, DiffLine } from './hunk-model.js'

/**
 * Parse a unified diff string into structured DiffFile objects.
 */
export function parseUnifiedDiff(input: string): DiffFile[] {
  const files: DiffFile[] = []
  const lines = input.split('\n')
  let i = 0

  while (i < lines.length) {
    // Look for "diff --git" header to start a new file
    if (!lines[i].startsWith('diff --git')) {
      i++
      continue
    }

    // Parse the diff --git header to get paths
    const gitHeader = lines[i]
    const headerPaths = parseGitHeaderPaths(gitHeader)
    i++

    let oldPath: string | undefined
    let newPath = headerPaths.newPath

    // Process headers (index, old mode, new mode, similarity index, etc.)
    while (i < lines.length && !lines[i].startsWith('diff --git') && !lines[i].startsWith('@@ ')) {
      const line = lines[i]

      if (line.startsWith('--- ')) {
        oldPath = parseFilePath(line.slice(4))
      } else if (line.startsWith('+++ ')) {
        newPath = parseFilePath(line.slice(4))
      }
      // Skip: index, old mode, new mode, similarity index, rename from/to, etc.

      i++
    }

    // Determine the final path
    const path = newPath ?? oldPath ?? headerPaths.newPath ?? 'unknown'
    const finalOldPath = oldPath !== path ? oldPath : undefined

    // Parse hunks
    const hunks: DiffHunk[] = []
    while (i < lines.length && lines[i].startsWith('@@ ')) {
      const { hunk, nextIndex } = parseHunk(lines, i)
      hunks.push(hunk)
      i = nextIndex
    }

    files.push({
      path,
      ...(finalOldPath ? { oldPath: finalOldPath } : {}),
      hunks,
    })
  }

  return files
}

/**
 * Parse paths from the "diff --git a/... b/..." header line.
 */
function parseGitHeaderPaths(header: string): { oldPath: string; newPath: string } {
  // Format: diff --git a/path b/path
  // Use regex to handle paths with spaces
  const match = header.match(/^diff --git a\/(.+?) b\/(.+)$/)
  if (match) {
    return { oldPath: match[1], newPath: match[2] }
  }
  // Fallback: split on space after "diff --git "
  const rest = header.slice('diff --git '.length)
  const parts = rest.split(' b/')
  if (parts.length === 2) {
    return {
      oldPath: parts[0].replace(/^a\//, ''),
      newPath: parts[1],
    }
  }
  return { oldPath: 'unknown', newPath: 'unknown' }
}

/**
 * Parse a file path from --- or +++ header lines.
 * Handles "/dev/null" for added/deleted files and "a/" / "b/" prefixes.
 */
function parseFilePath(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '/dev/null') {
    return '/dev/null'
  }
  // Strip a/ or b/ prefix
  if (trimmed.startsWith('a/') || trimmed.startsWith('b/')) {
    return trimmed.slice(2)
  }
  return trimmed
}

/**
 * Parse a single hunk starting at the given line index.
 * Returns the parsed hunk and the index of the next line to process.
 */
function parseHunk(lines: string[], startIndex: number): { hunk: DiffHunk; nextIndex: number } {
  const headerLine = lines[startIndex]
  const rangeMatch = headerLine.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)

  if (!rangeMatch) {
    throw new Error(`Invalid hunk header at line ${startIndex}: ${headerLine}`)
  }

  const oldStart = parseInt(rangeMatch[1], 10)
  const oldLines = rangeMatch[2] !== undefined ? parseInt(rangeMatch[2], 10) : 1
  const newStart = parseInt(rangeMatch[3], 10)
  const newLines = rangeMatch[4] !== undefined ? parseInt(rangeMatch[4], 10) : 1

  const diffLines: DiffLine[] = []
  let oldLine = oldStart
  let newLine = newStart
  let i = startIndex + 1

  while (i < lines.length) {
    const line = lines[i]

    // Stop at the next hunk header, next file diff, or end of input
    if (line.startsWith('@@ ') || line.startsWith('diff --git')) {
      break
    }

    // Tolerate "\ No newline at end of file"
    if (line.startsWith('\\')) {
      i++
      continue
    }

    if (line.length === 0 && i === lines.length - 1) {
      // Last empty line in input — skip trailing newline artifact
      i++
      break
    }

    const prefix = line[0]
    const content = line.slice(1)

    if (prefix === '+') {
      diffLines.push({
        type: 'added',
        content,
        newLine: newLine,
      })
      newLine++
    } else if (prefix === '-') {
      diffLines.push({
        type: 'removed',
        content,
        oldLine: oldLine,
      })
      oldLine++
    } else if (prefix === ' ') {
      diffLines.push({
        type: 'context',
        content,
        oldLine: oldLine,
        newLine: newLine,
      })
      oldLine++
      newLine++
    } else if (line === '') {
      // Empty context line (some diffs have empty context lines without the space prefix)
      // Treat as context only if we haven't consumed all expected lines
      const remainingOld = oldLines - (oldLine - oldStart)
      const remainingNew = newLines - (newLine - newStart)
      if (remainingOld > 0 && remainingNew > 0) {
        diffLines.push({
          type: 'context',
          content: '',
          oldLine: oldLine,
          newLine: newLine,
        })
        oldLine++
        newLine++
      } else {
        break
      }
    } else {
      // Unknown line prefix — stop parsing this hunk
      break
    }

    i++
  }

  return {
    hunk: {
      oldStart,
      oldLines,
      newStart,
      newLines,
      lines: diffLines,
    },
    nextIndex: i,
  }
}
