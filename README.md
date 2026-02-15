# zeitgeist app

next.js app router frontend with a fastify backend for auth, submissions, editorial workflow, bookmarks, reactions, and analytics.

localhost works without ghost. ghost adapters exist but are disabled by default.

## stack

- frontend: next.js app router + tailwind
- backend: fastify + prisma + zod + argon2
- db: postgresql
- object storage: minio

## local setup

### requirements

- node.js 20+
- npm 10+
- docker compose

### env files

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

default local adapter values:

- `CONTENT_PROVIDER=local`
- `PUBLISH_PROVIDER=local`

## run infrastructure

```bash
docker compose up -d
```

services:

- postgres: `localhost:5432`
- minio api: `localhost:9000`
- minio console: `localhost:9001`

create bucket `zeitgeist` in minio console if it does not exist.

## backend run

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

backend url: `http://localhost:4000`

## create initial admin user

```bash
cd backend
npm run seed:admin -- admin@example.com "admin user" "strongpassword123"
```

## frontend run

```bash
npm install
npm run dev
```

frontend url: `http://localhost:3000`

## ghost integration

ghost is optional for local development.

to enable ghost paths later:

- set `CONTENT_PROVIDER=ghost` and provide content api env vars
- set `PUBLISH_PROVIDER=ghost` and provide admin api env vars

if ghost adapters are enabled without env values, startup fails with a clear error.

## local e2e checklist

- auth
- register, login, logout, and `/api/auth/me` in browser session

- article engagement
- open article page and verify view counts increase
- toggle bookmark while logged in
- set/update/clear reactions while logged in

- account cabinet
- open `/account`
- verify bookmarks list
- verify submissions list and review messages

- manuscript submission
- open `/upload`
- create submission, upload pdf to minio, complete upload
- verify submission status appears in `/account`

- admin cabinet
- login as admin and open `/admin`
- filter queue by status
- request changes with message
- reject with optional reason
- approve with section and publish

- author promotion and analytics
- approve first submission from a reader account
- confirm user role promoted to `author`
- confirm `/account` shows author analytics charts and top articles

- local publishing
- after approval, confirm published article is visible in frontend lists via local content overlay

## backend integration tests

backend integration tests are in `backend/tests/integration.test.ts` and include:

- auth register, login, me
- analytics view increment and unique visitor dedup by `zg_vid`
- approve path concurrency safety with parallel admin approve calls
- submission upload flow and author promotion

### run integration tests locally

```bash
cd backend
cp .env.test.example .env.test
docker compose -f docker-compose.test.yml up -d
set -a && source .env.test && set +a
npm install
npm run prisma:generate
npm run prisma:deploy
npm run test:integration
```

cleanup:

```bash
cd backend
docker compose -f docker-compose.test.yml down -v
```

### run ci steps locally

```bash
cd backend
cp .env.test.example .env.test
docker compose -f docker-compose.test.yml up -d
set -a && source .env.test && set +a
npm install --no-audit --no-fund
npm run prisma:generate
npm run prisma:deploy
npm run test:integration
```
