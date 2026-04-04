# architecture

this document defines the local-first publishing architecture for zeitgeist and the production ghost integration path.

## goals

- localhost must run end-to-end without ghost
- ghost integrations must exist behind adapters and stay disabled unless env enables them
- all analytics and engagement data must live in postgres and use internal article ids
- editorial workflow must be auditable with strict state transitions and role-based access control

## service layout

- next.js app router in repository root
- fastify backend in `backend/`
- postgres for auth, editorial workflow, content registry, and analytics
- minio for manuscript and published pdf objects

## internal article registry

`article` is the canonical content identity table.

- every article has an internal id used by bookmarks, reactions, and analytics
- source is `local` or `ghost`
- local publishes store local html and pdf references
- ghost publishes/fetches map external ghost ids and slugs into internal rows
- lazy upsert is used when ghost content is viewed so analytics can always reference an internal article id

## adapters

### content provider adapter

front-end content reads are routed through `services/content`.

- `local` provider: static seed content + backend db overlay for newly published local submissions
- `ghost` provider: ghost content api integration, disabled unless env is set
- provider selection is controlled by `CONTENT_PROVIDER` and defaults to `local`

### publisher adapter

admin approve uses a backend publisher abstraction.

- `LocalPublisher`: writes published article row in postgres and exposes it via local content overlay
- `GhostPublisher`: publishes to ghost admin api, stores ghost mapping in article registry
- publisher selection is controlled by `PUBLISH_PROVIDER` and defaults to `local`

## auth and security

- cookie-backed server sessions with opaque token in `zg_session`
- csrf double-submit token in `zg_csrf` and custom header check for mutating endpoints
- argon2id password hashing
- generic auth errors to avoid account enumeration leakage
- route-level rbac checks for admin and author functionality
- rate limiting on auth, analytics, and admin mutation routes
- cors origin allowlist from `BACKEND_CORS_ORIGIN` and optional `BACKEND_CORS_ORIGINS`

## submissions workflow model

submission state machine:

- `draft`
- `submitted`
- `in_review`
- `needs_changes`
- `resubmitted`
- `approved`
- `published`
- `rejected` terminal

workflow rules:

- only valid transitions are accepted
- admin actions and publish operations are logged in `audit_log`
- review notes are stored in `review_message`
- approving a submission triggers publisher adapter
- first successful publish promotes `reader` to `author`

## analytics model

analytics is privacy-friendly and article-centric.

- backend manages random `zg_vid` visitor cookie
- frontend sends `POST /api/analytics/activity` for site pageviews and heartbeat presence
- article pages send `POST /api/analytics/activity` with internal article id so site traffic and article views share one visitor identity
- daily aggregates in `article_daily_stats` (`views`, `unique_visitors`)
- unique dedup key in `article_daily_visitor` (`article_id`, `date`, `visitor_id`)
- site presence is stored in `site_visitor` (`visitor_id`, `user_id`, `last_seen_at`)
- site pageview buckets are stored in `site_traffic_bucket` (`hour` / `day`)
- guest dedup rows live in `site_daily_visitor` and power admin dashboard anonymous-user counts
- no raw ip storage
- online is defined as activity within the last 10 minutes
- anonymous audience is defined as unique guest visitor ids with at least one anonymous pageview in the last 30 days
- upsert and transactional increments keep counters correct under concurrent writes
- visitor dedup rows in `article_daily_visitor` should be pruned by scheduled retention jobs

## html trust boundaries

- published html rendered by the frontend should be treated as trusted editorial output
- user-submitted abstract text is escaped before publisher adapters convert it to html
- ghost html rendering should be limited to trusted editor roles in ghost admin

## production edge requirements

- terminate tls at the reverse proxy for `api.<domain>`
- forward request ids and enforce request size limits
- add baseline security headers at the reverse proxy
- configure backup and restore runbooks for postgres and object storage

## engagement model

- bookmarks: unique `(user_id, article_id)`
- reactions: one reaction per user per article with updateable type
- author dashboard reads per-article bookmark counts, reaction breakdowns, and daily view series

## local runtime behavior

- `CONTENT_PROVIDER=local` by default
- `PUBLISH_PROVIDER=local` by default
- ghost env vars are optional placeholders in local setup
- if ghost provider/publisher is enabled without required env, backend/provider fails with explicit setup error

## frontend cabinets

- `/account`: bookmarks, submission statuses, review messages, submit entrypoint, author analytics, and admin-only editorial + site analytics sections
- `/admin`: legacy compatibility route that redirects into admin sections of `/account`
- article page: ensure internal mapping, send analytics activity event, support bookmark and reaction actions

## testing scope

minimum backend integration coverage:

- register/login/me
- bookmarks toggle/list
- reaction set/update/clear
- analytics views with unique dedup per visitor/day
- submission create + upload init/complete
- admin approve triggers publish adapter and role promotion
