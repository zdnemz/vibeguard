/**
 * VG-AUTH-001 — Next.js middleware matcher narrowed
 *
 * Detects when a middleware matcher route has been changed from a wildcard
 * pattern (e.g., "/dashboard/:path*") to an exact route (e.g., "/dashboard"),
 * which may leave nested routes unprotected.
 */

import type { DiffFile, DiffHunk, DiffLine } from '@vibeguard/core'
import type { Finding, Rule } from '@vibeguard/core'

type RouteInfo = {
  fullRoute: string
  baseRoute: string
  hasPathWildcard: boolean
}

/**
 * Extract a matcher route pattern from a line of middleware code.
 * Returns null if the line doesn't contain a recognizable route pattern.
 */
function extractMatcherRoute(content: string): RouteInfo | null {
  // Match a quoted string (single or double quotes)
  const match = content.match(/['"]([^'"]+)['"]/)
  if (!match) return null

  const fullRoute = match[1]

  // Must look like a route (starts with /)
  if (!fullRoute.startsWith('/')) return null

  const hasPathWildcard = fullRoute.endsWith('/:path*')
  const baseRoute = hasPathWildcard
    ? fullRoute.slice(0, -'/:path*'.length)
    : fullRoute

  return { fullRoute, baseRoute, hasPathWildcard }
}

/**
 * Analyze a single hunk for matcher narrowing.
 * Looks for a removed line with /:path* and an added line with the same
 * base route but without the wildcard, within the same hunk.
 */
function analyzeHunk(hunk: DiffHunk): Array<{ removed: RouteInfo; added: RouteInfo }> {
  const matches: Array<{ removed: RouteInfo; added: RouteInfo }> = []

  const removedRoutes = hunk.lines
    .filter((l): l is DiffLine & { type: 'removed' } => l.type === 'removed')
    .map(l => extractMatcherRoute(l.content))
    .filter((r): r is RouteInfo => r !== null && r.hasPathWildcard)

  const addedRoutes = hunk.lines
    .filter((l): l is DiffLine & { type: 'added' } => l.type === 'added')
    .map(l => extractMatcherRoute(l.content))
    .filter((r): r is RouteInfo => r !== null && !r.hasPathWildcard)

  for (const removed of removedRoutes) {
    for (const added of addedRoutes) {
      if (added.baseRoute === removed.baseRoute) {
        matches.push({ removed, added })
      }
    }
  }

  return matches
}

/**
 * Analyze a middleware file diff for matcher narrowing.
 */
function analyze(file: DiffFile): Finding[] {
  const findings: Finding[] = []

  for (const hunk of file.hunks) {
    const matches = analyzeHunk(hunk)

    for (const { removed, added } of matches) {
      // Extract a human-friendly route name (strip leading /)
      const routeName = removed.baseRoute.replace(/^\//, '')

      findings.push({
        id: 'VG-AUTH-001',
        severity: 'critical',
        file: file.path,
        title: 'Route protection may have been weakened.',
        evidence: [
          `matcher changed from "${removed.fullRoute}" to "${added.fullRoute}"`,
        ],
        why: `Nested routes such as ${added.baseRoute}/settings may no longer be protected.`,
        review: [
          `Confirm all nested ${routeName} routes still require authentication.`,
        ],
        test: [
          `Request ${added.baseRoute}/settings without a session.`,
          'Expected: redirect or 401.',
        ],
      })
    }
  }

  return findings
}

export const vgAuth001: Rule = {
  id: 'VG-AUTH-001',
  severity: 'critical',
  preset: 'nextjs-app-router',
  match: ['middleware.ts', 'src/middleware.ts'],
  analyze,
}
