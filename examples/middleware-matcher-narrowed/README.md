# VG-AUTH-001 — Middleware Matcher Narrowed

## What happened

A developer asked an AI coding agent to clean up the auth middleware:

> "Clean up the auth middleware and protect dashboard routes."

The agent simplified the matcher from `"/dashboard/:path*"` to `"/dashboard"`. The change looks like a minor cleanup — the word "dashboard" is still there. But the `:path*` segment was what made the matcher apply to **all nested routes** under `/dashboard`.

## What VibeGuard catches

VibeGuard detects that a Next.js middleware matcher route was narrowed by removing the `/:path*` wildcard segment.

```
Critical VG-AUTH-001
File: middleware.ts

Route protection may have been weakened.

Evidence:
- matcher changed from "/dashboard/:path*" to "/dashboard"

Why it matters:
Nested routes such as /dashboard/settings may no longer be protected.
```

## Why it matters

Without `:path*`, the middleware only runs on the exact path `/dashboard`. Every nested route becomes unprotected:

- `/dashboard/settings` — **unprotected**
- `/dashboard/billing` — **unprotected**
- `/dashboard/api/users` — **unprotected**
- `/dashboard/admin` — **unprotected**

Any unauthenticated user can now access these pages directly. This is especially dangerous because the change looks harmless in a code review — the route name is still there, and the diff is a single character-level change that is easy to skim past.

## The diff

```diff
 export const config = {
-  matcher: ["/dashboard/:path*"],
+  matcher: ["/dashboard"],
 };
```

## How to verify

1. Start the dev server and log out.
2. Navigate to `/dashboard/settings` without a session.
3. **Expected:** redirect to `/login` (or 401).
4. **Actual after this change:** the settings page loads without authentication.
