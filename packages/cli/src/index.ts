#!/usr/bin/env node

/**
 * VibeGuard CLI — Dangerous-change detector for AI-assisted diffs.
 *
 * Usage:
 *   vibeguard diff --preset nextjs-app-router
 *   vibeguard diff --preset nextjs-app-router --format json
 *   vibeguard diff --preset nextjs-app-router --base main
 *   vibeguard diff --preset nextjs-app-router --all
 *
 * Exit codes:
 *   0 — No dangerous changes found
 *   1 — Dangerous changes found
 *   2 — Error (invalid args, git failure, etc.)
 */

import { parseArgs } from 'node:util'
import { runDiffCommand } from './commands/diff.js'

export const CLI_NAME = 'vibeguard'
export const VERSION = '0.1.0'

/** Print usage help */
function printHelp(): void {
  console.log(`
${CLI_NAME} v${VERSION} — Dangerous-change detector for AI-assisted diffs

Usage:
  ${CLI_NAME} diff [options]

Commands:
  diff        Parse a git diff and detect dangerous changes

Options:
  --preset <name>     Rule preset to use (default: "nextjs-app-router")
  --format <format>   Output format: terminal|json|markdown (default: "terminal")
  --base <ref>        Compare against a base ref (runs "git diff <ref>...HEAD")
  --all               Show all findings (including suppressed)
  --help, -h          Show this help message
  --version, -v       Show version

Examples:
  ${CLI_NAME} diff --preset nextjs-app-router
  ${CLI_NAME} diff --format json
  ${CLI_NAME} diff --base main
  ${CLI_NAME} diff --preset nextjs-app-router --format markdown
`.trim())
}

/** Print version */
function printVersion(): void {
  console.log(`${CLI_NAME} v${VERSION}`)
}

/** Main entry point */
function main(): void {
  const args = process.argv.slice(2)

  // Handle no arguments
  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  // Extract the command (first non-flag argument)
  const command = args[0]

  if (command === '--help' || command === '-h') {
    printHelp()
    process.exit(0)
  }

  if (command === '--version' || command === '-v') {
    printVersion()
    process.exit(0)
  }

  if (command !== 'diff') {
    console.error(`Error: Unknown command "${command}".`)
    console.error('  Available commands: diff')
    console.error(`  Run "${CLI_NAME} --help" for usage information.`)
    process.exit(2)
  }

  // Parse options for the diff command
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      preset: { type: 'string', default: 'nextjs-app-router' },
      format: { type: 'string', default: 'terminal' },
      base: { type: 'string' },
      all: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  })

  if (values.help) {
    printHelp()
    process.exit(0)
  }

  // Validate format
  const validFormats = ['terminal', 'json', 'markdown']
  if (!validFormats.includes(values.format!)) {
    console.error(`Error: Invalid format "${values.format}".`)
    console.error(`  Valid formats: ${validFormats.join(', ')}`)
    process.exit(2)
  }

  // Validate preset
  const validPresets = ['nextjs-app-router']
  if (!validPresets.includes(values.preset!)) {
    console.error(`Error: Unknown preset "${values.preset}".`)
    console.error(`  Available presets: ${validPresets.join(', ')}`)
    process.exit(2)
  }

  // Run the diff command
  const exitCode = runDiffCommand({
    preset: values.preset as 'nextjs-app-router',
    format: values.format as 'terminal' | 'json' | 'markdown',
    base: values.base,
    all: values.all ?? false,
  })

  process.exit(exitCode)
}

main()
