/**
 * VibeGuard diff hunk model.
 *
 * Represents the structured output of parsing a unified diff.
 * Each DiffFile contains one or more hunks, and each hunk contains
 * a sequence of added, removed, or context lines with their
 * corresponding old/new line numbers.
 */

export type DiffFile = {
  path: string
  oldPath?: string
  hunks: DiffHunk[]
}

export type DiffHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export type DiffLine = {
  type: 'added' | 'removed' | 'context'
  content: string
  oldLine?: number
  newLine?: number
}
