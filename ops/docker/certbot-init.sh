#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${1:-.env.production}"
case "$ENV_FILE" in
  /*) ENV_PATH="$ENV_FILE" ;;
  *) ENV_PATH="./$ENV_FILE" ;;
esac

if [ ! -f "$ENV_PATH" ]; then
  echo "missing env file: $ENV_PATH" >&2
  exit 1
fi

set -a
. "$ENV_PATH"
set +a

cp ops/nginx/nginx.bootstrap.conf ops/nginx/active.conf

docker compose --env-file "$ENV_PATH" up -d postgres minio minio-init backend frontend ghost nginx

docker compose --env-file "$ENV_PATH" run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$PRIMARY_DOMAIN" \
  -d "$WWW_DOMAIN" \
  -d "$API_DOMAIN"

cp ops/nginx/nginx.conf ops/nginx/active.conf
docker compose --env-file "$ENV_PATH" up -d nginx
docker compose --env-file "$ENV_PATH" exec nginx nginx -s reload

echo "certificates issued and nginx switched to TLS config"
