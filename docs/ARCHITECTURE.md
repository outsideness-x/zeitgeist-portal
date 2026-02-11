# architecture plan

this repository is being upgraded into a production-ready publishing and research portal while keeping local development independent from ghost.

## goals

- keep localhost fully functional with no ghost instance
- add a ghost integration path behind a provider adapter
- add a standalone app backend with auth, rbac, submissions, signed uploads, and signed downloads
- keep current next.js app router pages and visual style

## implementation phases

### content provider layer

- create a content provider interface in `services/content/types.ts`
- add `local` and `ghost` provider implementations in `services/content/providers`
- route provider selection through env `CONTENT_PROVIDER`
- default to `local` to keep localhost stable
- ensure ghost provider throws clear setup errors only when explicitly enabled
- expose a single facade at `services/content/index.ts`

### backend service

- add `backend/` fastify app with typescript
- validate env with zod at process startup
- add prisma schema for users, sessions, submissions, files, audit logs, library items
- use secure http-only cookie sessions with csrf token checks for mutating routes
- hash passwords with argon2
- enforce rbac on protected routes
- add rate limits for auth and upload init endpoints
- add s3-compatible signing and object checks via minio-compatible aws sdk v3

### frontend integration

- replace imports from legacy ghost service with content provider facade
- replace modal mock auth with backend calls
- add session bootstrap via `/api/auth/me`
- replace upload simulation with real submission + presign + direct upload + finalize flow
- add lightweight dashboard pages for review flows
- keep current visual design and routing patterns

### local infrastructure

- add `docker-compose.yml` with postgresql and minio only
- add root and backend `.env.example` files
- document local run path in readme

### testing and verification

- backend integration tests with supertest:
  - register, login, me
  - submission create
  - upload init
  - upload complete validation path
- run lint and build for next app
- run backend tests and type checks

## key constraints respected

- no ghost dependency in local run path
- no secret values committed
- strict typescript kept enabled
- provider switch avoids future ui refactor for ghost rollout
