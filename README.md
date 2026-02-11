# zeitgeist app

next.js app router portal with a local-first content layer, plus a separate fastify backend for auth, submissions, and signed file flows.

ghost is supported through an adapter but is not required for local development.

## architecture overview

- frontend: next.js app router in the repository root
- content provider facade: `services/content/index.ts`
  - `local` provider is default and works without ghost
  - `ghost` provider is available when env is configured
- backend: fastify + prisma in `backend/`
- database: postgresql (local via docker compose)
- object storage: minio (local via docker compose)

## local prerequisites

- node.js 20+
- npm 10+
- docker and docker compose

## environment setup

### root env

```bash
cp .env.example .env
```

default local setup uses:

- `CONTENT_PROVIDER=local`
- `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000`

### backend env

```bash
cp backend/.env.example backend/.env
```

## start local infrastructure

```bash
docker compose up -d
```

this starts:

- postgresql on `localhost:5432`
- minio api on `localhost:9000`
- minio console on `localhost:9001`

## backend setup and run

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

backend default url: `http://localhost:4000`

## create the first editor user

run this in another terminal:

```bash
cd backend
npm run create:editor -- editor@example.com "editor user" "strongpassword123"
```

## frontend setup and run

in repository root:

```bash
npm install
npm run dev
```

frontend default url: `http://localhost:3000`

## local upload flow check

- open `http://localhost:3000`
- login/register from the header modal
- open `/upload`
- submit metadata + pdf
- verify upload progress reaches 100%
- open `/dashboard/submissions`
- open a submission detail page
- if reviewer/editor/admin, update status
- use download action and verify signed url response

## backend tests

```bash
cd backend
npm test
```

the integration suite uses supertest and mocks object storage helpers.

## ghost provider notes

local run does not require ghost.

to enable ghost provider later:

- set `CONTENT_PROVIDER=ghost` in root `.env`
- set required env values:
  - `GHOST_CONTENT_API_URL`
  - `GHOST_CONTENT_API_KEY`
  - `GHOST_IMAGE_HOST` (optional but recommended for next image remote patterns)

if ghost provider is selected but required env vars are missing, the app throws a clear initialization error.

## useful commands

### root

```bash
npm run dev
npm run build -- --webpack
npm run lint
```

### backend

```bash
cd backend
npm run dev
npm run typecheck
npm run test
npm run build
```
