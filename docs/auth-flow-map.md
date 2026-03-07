# auth flow map

## registration flow
- ui entry: `components/AuthModal.tsx` in register mode.
- request: `AuthProvider.register()` calls `POST /api/auth/register` through `backendRequest`.
- backend response: `user` object and `csrfToken`; server also sets `zg_session` and `zg_csrf` cookies.
- state update: `authStateReducer` receives `set-session` and sets `{ user, csrfToken, loading: false }`.
- persistence: session is cookie-backed on backend; client stores only in-memory auth state.

## login flow
- ui entry: `components/AuthModal.tsx` in login mode.
- request: `AuthProvider.login()` calls `POST /api/auth/login` through `backendRequest`.
- backend response:
  - standard path: `user` object and `csrfToken`; cookies are refreshed.
  - 2fa path: `requiresTwoFactor=true` and short-lived preauth challenge metadata.
- state update:
  - standard path: `authStateReducer` receives `set-session`.
  - 2fa path: modal switches to code verification step.
- persistence: cookie session remains source of truth on backend.

## google oauth flow
- ui entry: `components/AuthModal.tsx` button `Continue with Google`.
- start endpoint: `POST /api/auth/google/start` generates Google auth URL with strict state tracking.
- callback endpoint: `GET /api/auth/google/callback` validates state, exchanges code, resolves account.
- account resolution:
  - existing linked account: login (or step-up 2fa if enabled).
  - existing password user with same email: no silent linking; preauth link challenge + email code.
  - new email: create user + account(provider=`GOOGLE`).
- finalization: callback sets regular `zg_session`/`zg_csrf` or redirects with `auth=2fa` for step-up.

## email 2fa flow
- preauth storage: `PreAuthSession` table + `zg_preauth` httpOnly cookie (short ttl).
- code storage: `OneTimeCode` table with hashed code, nonce, expiry, attempts, resend counters, lock window.
- endpoints:
  - `GET /api/auth/2fa/status`
  - `POST /api/auth/2fa/send` (`/resend` alias)
  - `POST /api/auth/2fa/verify`
- login/link path: code verification consumes preauth and only then issues normal session cookies.
- settings path: enable/disable 2fa requires authenticated csrf-protected send+verify code steps.

## logout flow
- ui entry: `components/Header.tsx` logout action.
- request: `AuthProvider.logout()` calls `POST /api/auth/logout` with `x-csrf-token`.
- state reset: `authStateReducer` receives `clear-session` after request; it also clears locally when logout request fails to avoid stale ui.
- persistence clear: backend clears `zg_session` and `zg_csrf` cookies.

## session refresh flow
- trigger: `AuthProvider` calls `refreshMe()` once on mount with a strict-mode guard ref.
- request: `GET /api/auth/me` through `backendRequest`.
- success path: reducer receives `set-session`.
- unauthorized path: reducer receives `clear-session` without retry loops.
- failure path: network/config errors are normalized to user-safe messages and do not trigger recursive refresh calls.

## like action auth gating
- ui entry: `components/LikeButton.tsx`.
- logged-out behavior: button sets a clear message and dispatches `zg:open-auth-modal`.
- modal open handling: `components/Header.tsx` listens for `zg:open-auth-modal` and opens `AuthModal`.
- logged-in behavior: optimistic update is reconciled with `/api/articles/:id/like` server summary; final count is clamped and idempotent.

## api client safety and retry policy
- unified base url: `getBackendBaseUrl()` reads `NEXT_PUBLIC_BACKEND_URL` consistently across auth and non-auth calls.
- no-loop retry policy: one retry with short backoff only for `GET` network errors.
- timeout: requests abort after 12s to avoid hanging calls.
- graceful failures: normalized user-facing message for unreachable backend; no retry loops for mutating calls.
- logging: debug logs are emitted only in non-production and deduplicated by request signature.

## cookie security notes
- `zg_session`: `httpOnly`, `sameSite=lax`, `secure` in production.
- `zg_csrf`: readable by client for header echo, `sameSite=lax`, `secure` in production.
- csrf enforcement: mutating protected routes require matching `x-csrf-token`, `zg_csrf`, and server session csrf token.
