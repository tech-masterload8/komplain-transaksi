# Komplain Transaksi

Aplikasi web komplain transaksi reseller, dengan dua sisi:

- **Aplikasi pelanggan** (ponsel) — daftar transaksi, buat komplain, chat.
- **Admin CS** (`/admin`) — sistem tiket untuk memproses dan menyelesaikan komplain.

Semua teks antarmuka memakai **Bahasa Indonesia**.

## Sumber data

- **`otomaxbank` (hanya baca)** — tabel `reseller`, `transaksi`, dan bila ada `pengirim`. Aplikasi tidak pernah menulis ke sini.
- **`komplain` (database baru)** — tiket, pesan, akun staf, token kunjungan, dan shortcut pesan.

Header terenkripsi dari aplikasi Android hanya dipakai di sisi pelanggan. Panel admin memakai username + password.

Deploy produksi memakai **Docker** agar versi Node dan dependensi tidak bentrok dengan aaPanel.

## Autentikasi

- Di dalam aplikasi Android (menu website mode khusus), permintaan pertama membawa header `Authorization` terenkripsi. Server mendekripsinya, mengambil **kode reseller**, membaca `nama` dari tabel `reseller`, lalu menyimpan cookie sesi. Reseller **tidak perlu login** nomor HP/PIN.
- Layar pelanggan menampilkan `kode` dan `nama` di bagian atas, lalu daftar `transaksi` milik kode itu, diurutkan `tgl_entri` menurun. Pilih transaksi untuk membuat tiket komplain.
- Header Android tidak dipakai di `/admin`.
- Staf masuk di `/admin/login` (produksi: `https://103.179.67.71/komplain/admin/login`) dengan username dan password.

### Peran admin

| Peran | Tiket | Shortcut | Hapus data | Kelola pengguna |
| --- | --- | --- | --- | --- |
| CS | proses | ubah | tidak | tidak |
| Admin | proses | ubah | tidak | tidak |
| Super Admin | proses | ubah | ya | ya |

Akun super admin default (dibuat saat migrasi):

- username: `steinway`
- password: `Luminous1ty`

## Menjalankan lokal

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Kosongkan `NEXT_PUBLIC_BASE_PATH` di `.env` lokal agar aplikasi tetap di root. Lokal boleh `PORT=3000`; produksi memakai **3001** karena 3000 sudah terpakai monitoring.

- Pelanggan: `http://localhost:3000` (jika `PORT=3000`)
- Admin: `http://localhost:3000/admin/login`

## Docker di aaPanel

Image produksi dibangun di GitHub Actions dan diunggah ke GHCR:

`ghcr.io/tech-masterload8/komplain-transaksi:latest`

Jangan build di server. Setelah push ke `main`, buka **Actions** sampai workflow **Publish GHCR image** hijau, lalu di aaPanel Compose: **Pull** + **Recreate** (bukan Restart). Kali pertama, buka GitHub → Packages → `komplain-transaksi` → Package settings → **Public**.

Di terminal aaPanel (root):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/tech-masterload8/komplain-transaksi/main/deploy/setup.sh)
```

Skrip akan clone repo ke `/www/wwwroot/komplain`. Kali pertama ia membuat `.env` — isi password PostgreSQL (`OTOMAX_DB_PASSWORD`, `APP_DB_PASSWORD`) dan `WEB_DEV_PRIVATE_KEY`, lalu jalankan perintah yang sama lagi.

Setelah container jalan, **jangan** ganti reverse proxy `/` milik halaman monitoring mirroring database. Tambah path baru:

1. Website aaPanel → Reverse Proxy
   - **Proxy dir:** `/komplain`
   - **Target:** `http://127.0.0.1:3001` — **tanpa** garis miring di akhir (port 3000 sudah dipakai monitoring)
2. Sisipkan `deploy/nginx.conf.example` ke vhost yang sama. Jangan ganti `location /`.
3. Tambahkan `proxy_set_header Authorization $http_authorization;` agar WebView Android mengenali reseller
4. URL publik:
   - Pelanggan (Android): `https://103.179.67.71/komplain`
   - Admin: `https://103.179.67.71/komplain/admin/login` (username `steinway`)

`docker-compose.yml` memakai `network_mode: host` supaya `127.0.0.1` di `.env` tetap mengenai PgSQL aaPanel.

### Error `no pg_hba.conf entry` (28000)

Migrasi **hanya** ke database `komplain` (membuat tabel tiket/staf). `otomaxbank` tidak diubah.

Kalau log masih `user "komplain", database "otomaxbank"`, image lama yang jalan — **Pull** image GHCR terbaru, lalu Recreate.

Container Docker tampil sebagai IP `172.20.0.x`. Tambah di `pg_hba.conf` PostgreSQL, lalu reload:

```
host all all 172.16.0.0/12 scram-sha-256
```

### Error `password authentication failed` (28P01)

User OtoMax (`bankdb`) dan user aplikasi (`komplain`) **berbeda**. Migrasi tidak boleh memakai password `komplain` untuk masuk ke `otomaxbank`.

1. **Stop** project (jangan biarkan restart-loop).
2. Pastikan di aaPanel PostgreSQL sudah ada user `komplain` dan database `komplain`.
3. Isi env Compose, lalu **Recreate** (bukan hanya Save/Restart):
   - `OTOMAX_DB_USER=bankdb` + password bankdb
   - `APP_DB_USER=komplain` + password komplain
   - `NEXT_PUBLIC_BASE_PATH=/komplain`
   - `APP_URL=https://103.179.67.71/komplain`
4. Bungkus `WEB_DEV_PRIVATE_KEY` dengan tanda kutip tunggal.

Pull/rebuild image setelah perbaikan migrasi di `main`.

Cek pemetaan kolom OtoMax:

```bash
npm run inspect:otomax
```

Di panel, super admin juga melihat ringkasan mapping di dasbor.

## Kolom OtoMax yang dipakai

Aplikasi hanya **membaca** tabel yang diperlukan untuk komplain:

| Tabel | Kegunaan |
| --- | --- |
| `reseller` | Identitas dari header: `kode`, `nama`, `nomor_hp` |
| `transaksi` | Daftar/detail trx: `kode`, `tgl_entri`, `kode_produk`, `tujuan`, `kode_reseller`, `harga`, `status`, `tgl_status`, `sn`, `keterangan` |
| `produk` | Nama tampilan: `kode`, `nama` |
| `pengirim` | Cadangan peta nomor → `kode_reseller` |

Filter pelanggan: `transaksi.kode_reseller` = kode dari header Android. Urutan: `tgl_entri DESC`. `transaksi.pengirim` adalah pengirim pesan, bukan kode agen.

Tabel sinkron lain (`mutasi`, `operator`, `level`, dll.) tidak dipakai aplikasi ini.
