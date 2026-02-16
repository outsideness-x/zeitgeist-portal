# Zeitgeist Production Deployment Notes

## Final architecture on this VPS
- `nginx` (public): `80/443`
- `frontend` (Next.js): internal `3000`
- `backend` (Fastify + Prisma): internal `4000`
- `ghost` (admin/CMS only): internal `2368`
- `postgres`: internal `5432`
- `minio`: internal `9000`
- `minio-init`: one-shot bucket init (`zeitgeist`, private)

Routing:
- `https://zeitgeist.host` -> frontend
- `https://www.zeitgeist.host` -> frontend
- `https://api.zeitgeist.host/api/...` -> backend
- `https://api.zeitgeist.host/ghost` (+ non-`/api` paths) -> ghost

## Secrets and env files
These are server-local and gitignored:
- `./.env.production`
  - infra + frontend build/runtime vars
  - domains and Let's Encrypt email
  - Postgres/MinIO credentials
- `./backend/.env.production`
  - backend runtime vars (`DATABASE_URL`, CORS, S3, cookie secret, etc.)

## Reproducible deploy/redeploy
From repo root:
```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

First-time TLS/bootstrap flow:
```bash
./ops/docker/certbot-init.sh .env.production
```
This script:
1. uses HTTP bootstrap nginx config,
2. issues certs for `zeitgeist.host`, `www.zeitgeist.host`, `api.zeitgeist.host`,
3. switches to final TLS nginx config and reloads nginx.

## Update flow (after git pull)
```bash
git pull
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

## Rollback (quick)
1. Check recent commits/images.
2. Reset to prior commit and rebuild:
```bash
git checkout <known-good-commit>
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

## Logs and health
```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f nginx
docker compose --env-file .env.production logs -f backend
docker compose --env-file .env.production logs -f frontend
docker compose --env-file .env.production logs -f ghost
```

## Prisma migrations
Backend startup runs:
```bash
npx prisma migrate deploy
```
inside container before server boot.

Manual migration check/deploy:
```bash
docker compose --env-file .env.production exec backend npx prisma migrate deploy
```

## Ghost admin and content workflow
Ghost admin URL:
- `https://api.zeitgeist.host/ghost`

First login:
- Complete Ghost setup wizard (owner account).

If frontend should read Ghost Content API:
1. In Ghost Admin, create/get a Content API key (Integrations).
2. Set in `./.env.production`:
   - `GHOST_CONTENT_API_URL=https://api.zeitgeist.host`
   - `GHOST_CONTENT_API_KEY=<ghost_content_api_key>`
3. Rebuild/restart frontend:
```bash
docker compose --env-file .env.production build frontend
docker compose --env-file .env.production up -d frontend
```

Backend publish-to-Ghost is optional and currently disabled:
- `PUBLISH_PROVIDER=local`

## MinIO bucket policy
Default is private (`zeitgeist`).
To make bucket publicly downloadable:
```bash
./ops/docker/minio-bucket-public.sh .env.production
```

## TLS renewal
Manual renewal:
```bash
./ops/docker/certbot-renew.sh .env.production
```

Auto-renew cron is installed for user `deploy`:
```cron
17 3 * * * cd /home/deploy/apps/zeitgeist-portal && /home/deploy/apps/zeitgeist-portal/ops/docker/certbot-renew.sh .env.production >> /home/deploy/apps/zeitgeist-portal/ops/certbot/renew.log 2>&1
```

## Backups
### Postgres backup
```bash
docker compose --env-file .env.production exec -T postgres \
  pg_dump -U postgres -d zeitgeist > /home/deploy/apps/zeitgeist-portal/ops/backups/zeitgeist-$(date +%F-%H%M%S).sql
```

### Ghost content backup (includes SQLite DB + content)
```bash
mkdir -p /home/deploy/apps/zeitgeist-portal/ops/backups
docker run --rm \
  -v zeitgeist-portal_ghost_content:/ghost_content:ro \
  -v /home/deploy/apps/zeitgeist-portal/ops/backups:/backup \
  alpine sh -c 'tar czf /backup/ghost-content-$(date +%F-%H%M%S).tar.gz -C / ghost_content'
```

### MinIO data backup
```bash
docker run --rm \
  -v zeitgeist-portal_minio_data:/minio_data:ro \
  -v /home/deploy/apps/zeitgeist-portal/ops/backups:/backup \
  alpine sh -c 'tar czf /backup/minio-data-$(date +%F-%H%M%S).tar.gz -C / minio_data'
```

## Security checklist currently enforced
- Public ports: `80`, `443` only
- `postgres` and `minio` are internal-only (no published ports)
- HTTPS redirect enabled for all three hostnames
- TLS certificate from Let's Encrypt (SAN includes all 3 domains)
- Nginx headers: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- `client_max_body_size 50m`
