/**
 * VibeGuard rule definition type.
 *
 * A Rule describes a specific dangerous pattern to detect in diffs.
 * Rules are associated with presets and use glob patterns to match files.
 */

import type { DiffFile } from '../diff/hunk-model.js'
import type { Finding, Severity } from '../findings/finding.js'

export type Rule = {
  id: string
  severity: Severity
  preset: string
  match: string[]
  analyze(file: DiffFile): Finding[]
}
