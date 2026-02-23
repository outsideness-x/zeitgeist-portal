# auth manual checklist

## run log
- date: 2026-02-18
- scope: frontend auth state, modal flow, like gating, backend request safety
- note: local shell has no `npm`; command verification is executed through dockerized node where available

## registration
- [ ] valid registration works
- [ ] invalid email rejected
- [ ] weak password rejected (if policy exists)
- [ ] duplicate email handled
- [ ] after register, user is logged in (or guided to login) as designed

## login
- [ ] valid login works
- [ ] invalid password handled
- [ ] logout works and clears state

## session
- [ ] refresh on page reload works
- [ ] no infinite loops, no max update depth error

## permissions
- [ ] like/heart action logged out prompts auth modal
- [ ] like/heart action logged in updates +1/-1 or stays idempotent with server reconciliation

## build and runtime
- [x] `npm run build` passes
- [x] `npm run start` runs
- [x] no missing modules

## verification notes
- automated unit coverage for auth reducer and backend client behavior added in `backend/tests/frontend-auth-client.unit.test.ts`.
- backend integration auth and like idempotency checks already exist in `backend/tests/integration.test.ts`.
- frontend verification command results:
  - `npm run lint` passed (dockerized node:20-alpine).
  - `npm run build` passed (dockerized node:20-alpine).
  - `npm run start` smoke check passed and served html from `http://127.0.0.1:3000`.
- backend verification command results:
  - `npm run test -- tests/frontend-auth-client.unit.test.ts` passed (5/5).
- pending manual checks should be completed against staging or production-like environment with real browser session.
