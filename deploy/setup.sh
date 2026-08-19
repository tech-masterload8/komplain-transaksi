#!/bin/bash
# Deploy Docker di aaPanel. Postgres host (otomaxbank + komplain) tidak diubah.
# Repo: https://github.com/tech-masterload8/komplain-transaksi

set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/komplain}"
REPO_URL="${REPO_URL:-https://github.com/tech-masterload8/komplain-transaksi.git}"

mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only origin main
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "Buat file .env dulu (salin dari .env.example) lalu jalankan ulang."
  exit 1
fi

docker compose up -d --build
docker compose ps
