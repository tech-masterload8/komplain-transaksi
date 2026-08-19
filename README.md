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
- Staf masuk di `/admin/login` dengan username dan password.

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

- Pelanggan: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`

## Docker di aaPanel

Di terminal aaPanel (root):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/tech-masterload8/komplain-transaksi/main/deploy/setup.sh)
```

Skrip akan clone repo ke `/www/wwwroot/komplain`. Kali pertama ia membuat `.env` — isi password PostgreSQL (`OTOMAX_DB_PASSWORD`, `APP_DB_PASSWORD`) dan `WEB_DEV_PRIVATE_KEY`, lalu jalankan perintah yang sama lagi.

Setelah container jalan:

1. Website aaPanel → Reverse Proxy ke `http://127.0.0.1:3000`
2. Tambahkan `proxy_set_header Authorization $http_authorization;` agar WebView Android mengenali reseller
3. Admin: `https://domain-anda/admin/login` (username `steinway`)

`docker-compose.yml` memakai `network_mode: host` supaya `127.0.0.1` di `.env` tetap mengenai PgSQL aaPanel.

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
