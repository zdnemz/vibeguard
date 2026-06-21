export const VERSION = '0.1.0'

export type { DiffFile, DiffHunk, DiffLine } from './diff/hunk-model.js'
export { parseUnifiedDiff } from './diff/parse-unified-diff.js'

export type { Severity, Finding } from './findings/finding.js'
export { severityRank, validateFinding } from './findings/finding.js'

export type { Rule } from './rules/define-rule.js'
export { runRules } from './rules/rule-engine.js'

export type { PresetConfig } from './presets/nextjs-app-router.js'
export { buildNextjsAppRouterPreset } from './presets/nextjs-app-router.js'
