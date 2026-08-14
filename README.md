# Komplain Transaksi

Aplikasi web komplain transaksi reseller, dengan dua sisi:

- **Aplikasi pelanggan** (ponsel) — daftar transaksi, buat komplain, chat.
- **Admin CS** (`/admin`) — sistem tiket untuk memproses dan menyelesaikan komplain.

Semua teks antarmuka memakai **Bahasa Indonesia**.

## Sumber data

- **`otomaxbank` (hanya baca)** — tabel `reseller` dan `transaksi`. Aplikasi tidak pernah menulis ke sini.
- **`komplain` (database baru)** — tiket, pesan, akun CS, token kunjungan, dan shortcut pesan.

Hanya aplikasi pelanggan yang membaca header terenkripsi dari aplikasi Android. Panel admin memakai login staf (nomor + PIN).

PM2 dipakai, bukan Docker, karena aaPanel sudah menyediakan Node.js + PM2 + Nginx.

## Menjalankan lokal

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

- Pelanggan: `http://localhost:3000`
- Admin CS: `http://localhost:3000/admin/login`

Buat akun CS lewat `CS_PHONE`, `CS_PIN`, dan `CS_NAME` di `.env` lalu jalankan `npm run migrate`.

## Produksi di aaPanel

1. Di PgSQL, buat database `komplain` (`sql/001_create_database.sql`), lalu jalankan `sql/002_schema.sql` (dan `sql/003_tickets.sql` jika database sudah ada).
2. Clone repo ke `/www/wwwroot/komplain`.
3. Isi `.env` dari `.env.example`.
4. Node 20+:

```bash
npm install
npm run build
npm run migrate
pm2 start ecosystem.config.cjs
pm2 save
```

5. Arahkan Nginx ke port `3000` dan teruskan header `Authorization` (lihat `deploy/nginx.conf.example`) agar WebView Android bisa mengenali reseller saat pertama kali membuka menu.

## Autentikasi

- Di dalam aplikasi Android (menu website mode khusus), permintaan pertama membawa header `Authorization` terenkripsi. Server Node mendekripsinya, memetakan ke `reseller.kode`, lalu menyimpan cookie sesi. Header ini hanya terbaca pada pembukaan pertama, dan **tidak dipakai di `/admin`**.
- Login browser pelanggan memakai nomor HP + PIN tabel `reseller`.
- CS masuk di `/admin/login` memakai tabel `staff_users` di database `komplain`.
