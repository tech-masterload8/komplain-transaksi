/**
 * Kolom otomaxbank yang dipakai aplikasi (hanya SELECT).
 * Sumber: daftar tabel sinkron aaPanel.
 *
 * Dipakai: reseller, transaksi, produk, pengirim.
 * Tidak ditulis / tidak dibaca untuk komplain: mutasi, markup_produk,
 * tiket_deposit, mutasi_komisi, operator, parameter, mutasi_poin,
 * level, produk_level, hadiah_poin.
 */
export const OTOMAX_TRX_COLUMNS = {
  kode: "kode",
  tglEntri: "tgl_entri",
  tglStatus: "tgl_status",
  kodeProduk: "kode_produk",
  tujuan: "tujuan",
  kodeReseller: "kode_reseller",
  pengirim: "pengirim",
  harga: "harga",
  status: "status",
  sn: "sn",
  keterangan: "keterangan",
} as const;

export const OTOMAX_RESELLER_COLUMNS = {
  kode: "kode",
  nama: "nama",
  nomorHp: "nomor_hp",
  aktif: "aktif",
  deleted: "deleted",
} as const;

export const OTOMAX_PRODUK_COLUMNS = {
  kode: "kode",
  nama: "nama",
} as const;

export const OTOMAX_PENGIRIM_COLUMNS = {
  pengirim: "pengirim",
  tipePengirim: "tipe_pengirim",
  kodeReseller: "kode_reseller",
} as const;
