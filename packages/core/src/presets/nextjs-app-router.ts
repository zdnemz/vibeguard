/**
 * VibeGuard preset: nextjs-app-router
 *
 * Defines which rules belong to the nextjs-app-router preset.
 * The actual rule implementations live in @vibeguard/rules.
 * This file only provides the preset metadata so the CLI can
 * look up which rules to load.
 */

import type { Rule } from '../rules/define-rule.js'

export type PresetConfig = {
  name: string
  rules: Rule[]
}

/**
 * Build the nextjs-app-router preset from the provided rule array.
 * The CLI is responsible for supplying the actual Rule objects
 * (imported from @vibeguard/rules) to avoid a circular dependency
 * between core and rules.
 */
export function buildNextjsAppRouterPreset(rules: Rule[]): PresetConfig {
  return {
    name: 'nextjs-app-router',
    rules,
  }
}
