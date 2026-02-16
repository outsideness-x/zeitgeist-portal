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

docker run --rm --network zeitgeist-portal_internal \
  -e MINIO_ROOT_USER="$MINIO_ROOT_USER" \
  -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  -e S3_BUCKET="$S3_BUCKET" \
  minio/mc:latest \
  /bin/sh -c "mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" && mc anonymous set download local/\$S3_BUCKET"

echo "bucket policy changed to public download for $S3_BUCKET"
