#!/bin/bash
# Jalankan di terminal aaPanel sebagai root.
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

npm install
npm run build
npm run migrate
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
