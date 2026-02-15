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

## production deployment notes

target topology:

- `www.<your-domain>` points to ghost (ghost pro or managed host)
- `api.<your-domain>` points to your vps reverse proxy for the fastify backend
- postgres runs on the vps or managed postgres
- s3-compatible bucket stores submission and article pdf assets

ghost is optional in localhost and remains disabled by default.

### backend production env checklist

set these values in backend runtime:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...`
- `BACKEND_COOKIE_SECRET=<long random secret, at least 32 chars>`
- `BACKEND_CORS_ORIGIN=https://www.<your-domain>`
- `BACKEND_CORS_ORIGINS=https://app.<your-domain>,https://www.<your-domain>` when multiple web origins are needed
- `S3_ENDPOINT=https://<your-s3-endpoint>`
- `S3_REGION=<region>`
- `S3_ACCESS_KEY_ID=<key>`
- `S3_SECRET_ACCESS_KEY=<secret>`
- `S3_BUCKET=<bucket-name>`
- `S3_SIGNED_URL_EXPIRES_SECONDS=300`
- `UPLOAD_MAX_BYTES=26214400` or your chosen limit
- `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_SECONDS` tuned for your traffic
- `ANALYTICS_COOKIE_MAX_AGE_DAYS=<value>`
- `CONTENT_PROVIDER=ghost` only when ghost content api is configured
- `PUBLISH_PROVIDER=ghost` only when ghost admin api is configured
- `GHOST_CONTENT_API_URL`, `GHOST_CONTENT_API_KEY`, `GHOST_ADMIN_API_URL`, `GHOST_ADMIN_API_KEY` when ghost adapters are enabled

### reverse proxy baseline for api domain

example nginx location for `api.<your-domain>`:

```nginx
server {
  listen 443 ssl http2;
  server_name api.example.com;

  client_max_body_size 30m;
  gzip on;
  gzip_types application/json text/plain;

  add_header strict-transport-security "max-age=31536000; includeSubDomains" always;
  add_header x-content-type-options "nosniff" always;
  add_header x-frame-options "DENY" always;
  add_header referrer-policy "strict-origin-when-cross-origin" always;

  location / {
    proxy_http_version 1.1;
    proxy_set_header host $host;
    proxy_set_header x-forwarded-for $proxy_add_x_forwarded_for;
    proxy_set_header x-forwarded-proto https;
    proxy_set_header x-request-id $request_id;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
    proxy_connect_timeout 10s;
    proxy_pass http://127.0.0.1:4000;
  }
}
```

### backup and retention baseline

- postgres: daily full backups + point-in-time recovery if available
- object storage: bucket versioning + lifecycle policy for noncurrent versions
- analytics dedup retention: delete old `ArticleDailyVisitor` rows regularly (for example, keep 90 days):

```sql
delete from "ArticleDailyVisitor"
where "date" < now() - interval '90 days';
```

schedule this as a daily cron job on the database.

## pre-launch checklist

### what to buy

- a domain name
- a ghost hosting plan (ghost pro or managed host)
- a vps or managed runtime for backend api
- postgres hosting (managed or self-hosted on vps)
- s3-compatible object storage

### dns setup

- point `www` to ghost (usually `CNAME` to ghost host target)
- point `api` to your vps public ip (`A`/`AAAA`) or load balancer
- enable tls certificates for both `www` and `api`

### configure before first launch

- create postgres database and run backend prisma migrations
- create s3/minio bucket and credentials
- set backend env vars listed above
- set ghost api keys only if using ghost adapters in production
- set strict cors origins for your exact frontend domains

### verify after deploy

- open `https://api.<your-domain>/api/health` and confirm `ok: true`
- register/login/logout from frontend and confirm cookie session works
- publish one test submission through admin approve flow
- verify only `author/admin` roles can download article pdf links
- verify analytics counts move on article view and unique counts do not increment on repeated same-cookie views
- verify logs do not contain passwords, session tokens, or raw webhook payloads
