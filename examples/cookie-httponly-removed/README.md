# VG-AUTH-002 — Cookie httpOnly Removed

## What happened

A developer asked an AI agent to fix a client-side authentication check:

> "The client-side auth hook can't read the session cookie to check if the user is logged in. Fix it."

The agent changed `httpOnly: true` to `httpOnly: false` so that `document.cookie` can access the session token from client-side JavaScript. The hook now works, but the session cookie is exposed to every script running on the page — including any XSS payload.

## What VibeGuard catches

VibeGuard detects when `httpOnly` is changed from `true` to `false` within the same diff hunk.

```
Critical VG-AUTH-002
File: src/lib/auth.ts

Session cookie may now be readable by client-side JavaScript.

Evidence:
- httpOnly changed from true to false in cookie configuration

Why it matters:
An XSS vulnerability anywhere in the application could steal the session token via document.cookie.
```

## Why it matters

The `HttpOnly` flag prevents client-side JavaScript from reading the cookie. Removing it means:

- Any XSS vulnerability (injected `<script>`, compromised npm dependency, malicious browser extension) can call `document.cookie` and exfiltrate the session token.
- The attacker can replay the token to impersonate the user — even if the session is otherwise well-protected with `Secure` and `SameSite`.
- This is one of the most common security regressions in web applications because the change fixes an immediate functional problem while silently weakening security.

The correct fix for client-side auth state is to use a separate, non-sensitive token (or a server-side endpoint that returns auth status) rather than making the session cookie readable.

## The diff

```diff
  cookieStore.set("session", token, {
-   httpOnly: true,
+   httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
```

## How to verify

1. Write a test that asserts the `Set-Cookie` response header includes `HttpOnly`.
2. Run the test suite — the `createSession` test should fail after this change.
3. Manually inspect the `Set-Cookie` header in browser DevTools → Application → Cookies. The `HttpOnly` column should be checked.
