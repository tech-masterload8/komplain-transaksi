#!/usr/bin/env sh
set -eu

echo ">> Menjalankan migrasi database aplikasi"
npx tsx scripts/migrate.ts

echo ">> Membaca struktur otomaxbank (hanya baca)"
npx tsx scripts/inspect-otomax.ts || echo ">> Peringatan: otomaxbank belum bisa dibaca, aplikasi tetap dijalankan"

echo ">> Menjalankan aplikasi"
exec npx tsx server.ts
