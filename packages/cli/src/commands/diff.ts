/**
 * VibeGuard `diff` command.
 *
 * Parses a git diff, runs the rule engine with the specified preset,
 * and outputs findings in the requested format.
 *
 * Usage:
 *   vibeguard diff --preset nextjs-app-router
 *   vibeguard diff --preset nextjs-app-router --format json
 *   vibeguard diff --preset nextjs-app-router --base main
 *   vibeguard diff --preset nextjs-app-router --all
 */

import { execFileSync } from 'node:child_process'
import { parseUnifiedDiff, runRules, buildNextjsAppRouterPreset } from '@vibeguard/core'
import type { Finding } from '@vibeguard/core'
import { vgAuth001, vgAuth002, vgCi001, vgDep001, vgAgent003 } from '@vibeguard/rules'
import { formatTerminal } from '../output/terminal.js'
import { formatJSON } from '../output/json.js'
import { formatMarkdown } from '../output/markdown.js'

/** Supported output formats */
type Format = 'terminal' | 'json' | 'markdown'

/** Supported presets */
type PresetName = 'nextjs-app-router'

/** Options parsed from CLI arguments */
export type DiffCommandOptions = {
  preset: PresetName
  format: Format
  base?: string
  all: boolean
}

/**
 * Validate a git ref string to prevent command injection.
 * Only allows alphanumeric, hyphens, underscores, dots, slashes, and tildes.
 */
function validateGitRef(ref: string): void {
  if (!/^[a-zA-Z0-9._/~^-]+$/.test(ref)) {
    console.error(`Error: Invalid git reference "${ref}".`)
    console.error('  Refs may only contain letters, numbers, dots, slashes, hyphens, underscores, and tildes.')
    process.exit(2)
  }
}

/**
 * Get the git diff output as a string.
 * Uses `git diff` by default, or `git diff <base>...HEAD` if --base is set.
 * Uses execFileSync (no shell) to prevent command injection.
 */
function getGitDiff(base?: string): string {
  try {
    if (base) {
      validateGitRef(base)
      return execFileSync('git', ['diff', `${base}...HEAD`], {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB max
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    }
    return execFileSync('git', ['diff'], {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('not a git repository')) {
      console.error('Error: Not a git repository.')
      console.error('  Fix: Run this command from within a git repository.')
      process.exit(2)
    }
    if (message.includes('unknown revision')) {
      console.error(`Error: Unknown revision "${base}".`)
      console.error('  Fix: Check that the branch or commit reference exists.')
      process.exit(2)
    }
    console.error(`Error running git diff: ${message}`)
    process.exit(2)
  }
}

/**
 * Load all rules for the given preset.
 */
function loadPresetRules(presetName: PresetName) {
  switch (presetName) {
    case 'nextjs-app-router': {
      const allRules = [vgAuth001, vgAuth002, vgCi001, vgDep001, vgAgent003]
      return buildNextjsAppRouterPreset(allRules)
    }
    default:
      console.error(`Error: Unknown preset "${presetName}".`)
      console.error('  Available presets: nextjs-app-router')
      process.exit(2)
  }
}

/**
 * Execute the diff command.
 *
 * @returns exit code (0 = clean, 1 = findings found)
 */
export function runDiffCommand(options: DiffCommandOptions): number {
  // 1. Get the raw diff
  const rawDiff = getGitDiff(options.base)

  if (!rawDiff.trim()) {
    // No diff — nothing to analyze
    if (options.format === 'terminal') {
      console.log(`VibeGuard found no dangerous changes for preset ${options.preset}.`)
    } else if (options.format === 'json') {
      console.log(formatJSON(options.preset, []))
    } else if (options.format === 'markdown') {
      console.log(formatMarkdown(options.preset, []))
    }
    return 0
  }

  // 2. Parse the diff
  const files = parseUnifiedDiff(rawDiff)

  // 3. Load preset rules
  const preset = loadPresetRules(options.preset)

  // 4. Run the rule engine
  let findings: Finding[] = runRules(files, preset.rules)

  // 5. Apply --all filter (by default, show all findings — no truncation in v0)
  if (!options.all) {
    // In v0, we show all findings by default. --all is a no-op for now
    // but reserved for future use (e.g., showing suppressed low-severity findings)
  }

  // 6. Format and output
  switch (options.format) {
    case 'terminal':
      console.log(formatTerminal(findings, options.preset))
      break
    case 'json':
      console.log(formatJSON(options.preset, findings))
      break
    case 'markdown':
      console.log(formatMarkdown(options.preset, findings))
      break
  }

  // 7. Return exit code
  return findings.length > 0 ? 1 : 0
}
