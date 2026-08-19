#!/bin/bash
# Jalankan di terminal aaPanel sebagai root:
#   bash <(curl -fsSL https://raw.githubusercontent.com/tech-masterload8/komplain-transaksi/main/deploy/setup.sh)
#
# Postgres host (otomaxbank) tidak diubah. Container hanya menjalankan aplikasi.

set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/komplain}"
REPO_URL="${REPO_URL:-https://github.com/tech-masterload8/komplain-transaksi.git}"

if ! command -v git >/dev/null 2>&1; then
  echo "Install git dulu (aaPanel -> App Store -> Git)."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "Install Docker dulu (aaPanel -> App Store -> Docker), lalu jalankan ulang skrip ini."
  exit 1
fi

mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" pull --ff-only origin main
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  secret="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${secret}/" .env
  echo
  echo "File .env baru dibuat di $APP_DIR/.env"
  echo "Isi dulu ketiga nilai ini, simpan, lalu jalankan skrip ini lagi:"
  echo "  OTOMAX_DB_PASSWORD"
  echo "  APP_DB_PASSWORD"
  echo "  WEB_DEV_PRIVATE_KEY"
  exit 2
fi

need() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" .env | tail -n1 | cut -d= -f2- | tr -d '\r')"
  if [ -z "$value" ] || [ "$value" = "change-this-to-a-long-random-string" ]; then
    echo "Isi ${key} di $APP_DIR/.env lalu jalankan ulang skrip ini."
    exit 2
  fi
}

need OTOMAX_DB_PASSWORD
need APP_DB_PASSWORD
need WEB_DEV_PRIVATE_KEY
need SESSION_SECRET

compose pull
compose up -d
compose ps
echo
echo "Aplikasi jalan di port 3001 (network host), path /komplain."
echo "Di aaPanel: Website -> Reverse Proxy"
echo "  Proxy dir : /komplain"
echo "  Target    : http://127.0.0.1:3001   (tanpa garis miring di akhir)"
echo "Tambahkan header Authorization (lihat deploy/nginx.conf.example)."
echo "Pelanggan : https://103.179.67.71/komplain"
echo "Admin     : https://103.179.67.71/komplain/admin/login"
echo "Halaman monitoring di / tidak diganti."
