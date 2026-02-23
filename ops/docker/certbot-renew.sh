#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${1:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" run --rm certbot renew --webroot -w /var/www/certbot --quiet
docker compose --env-file "$ENV_FILE" exec nginx nginx -s reload

echo "renewal completed and nginx reloaded"
