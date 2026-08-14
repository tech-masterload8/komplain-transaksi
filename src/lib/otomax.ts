import { otomax } from "./db";
import { normalizePhone } from "./format";

type ColumnMap = Record<string, string>;

let transaksiCols: ColumnMap | null = null;
let resellerCols: ColumnMap | null = null;
let transaksiTable = "transaksi";
let resellerTable = "reseller";

async function resolveTable(name: string) {
  const { rows } = await otomax.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND lower(table_name) = lower($1)
     LIMIT 1`,
    [name],
  );
  if (!rows[0]) throw new Error(`Table "${name}" was not found in otomaxbank`);
  return rows[0].table_name;
}

async function columnsFor(table: string) {
  const { rows } = await otomax.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND lower(table_name) = lower($1)`,
    [table],
  );
  const map: Record<string, string> = {};
  for (const row of rows) map[row.column_name.toLowerCase()] = row.column_name;
  return map;
}

function pick(cols: Record<string, string>, candidates: string[]) {
  for (const candidate of candidates) {
    const found = cols[candidate.toLowerCase()];
    if (found) return found;
  }
  return null;
}

function ident(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function transaksiMap() {
  transaksiTable = await resolveTable("transaksi");
  if (!transaksiCols) transaksiCols = await columnsFor(transaksiTable);
  return {
    id: pick(transaksiCols, ["id", "kode", "trxid", "id_transaksi", "no"]),
    tgl: pick(transaksiCols, ["tgl", "tanggal", "tgl_entri", "tanggal_entri", "created_at"]),
    tglStatus: pick(transaksiCols, ["tgl_status", "tanggal_status", "tglstatus"]),
    tujuan: pick(transaksiCols, ["tujuan", "nomor", "no_tujuan", "nomer"]),
    harga: pick(transaksiCols, ["harga", "nominal", "harga_jual", "total"]),
    keterangan: pick(transaksiCols, ["keterangan", "ket", "pesan"]),
    sn: pick(transaksiCols, ["sn", "serial", "serial_number"]),
    kode: pick(transaksiCols, ["kode", "kode_produk", "produk", "kodeproduk"]),
    pengirim: pick(transaksiCols, ["pengirim", "kode_reseller", "reseller", "agen", "kodeagen"]),
    status: pick(transaksiCols, ["status"]),
  };
}

async function resellerMap() {
  resellerTable = await resolveTable("reseller");
  if (!resellerCols) resellerCols = await columnsFor(resellerTable);
  return {
    kode: pick(resellerCols, ["kode", "id", "kodeagen", "kode_agen"]),
    nama: pick(resellerCols, ["nama", "name"]),
    pin: pick(resellerCols, ["pin", "password", "sandi"]),
    phone: pick(resellerCols, ["nohp", "hp", "no_hp", "telp", "telepon", "phone"]),
    aktif: pick(resellerCols, ["aktif", "active", "status"]),
  };
}

export type OtomaxTransaction = {
  id: string;
  tanggalEntri: string | null;
  tanggalStatus: string | null;
  tujuan: string;
  nominal: number | null;
  keterangan: string;
  serialNumber: string;
  kodeProduk: string;
  kodeReseller: string;
  status: string | number | null;
};

export type OtomaxReseller = {
  kode: string;
  nama: string;
  phone: string;
  pin: string | null;
  aktif: string | number | boolean | null;
};

function rowToTransaction(row: Record<string, unknown>): OtomaxTransaction {
  return {
    id: String(row.id ?? ""),
    tanggalEntri: row.tanggal_entri ? String(row.tanggal_entri) : null,
    tanggalStatus: row.tanggal_status ? String(row.tanggal_status) : null,
    tujuan: String(row.tujuan ?? ""),
    nominal: row.nominal == null ? null : Number(row.nominal),
    keterangan: String(row.keterangan ?? ""),
    serialNumber: String(row.serial_number ?? ""),
    kodeProduk: String(row.kode_produk ?? ""),
    kodeReseller: String(row.kode_reseller ?? ""),
    status: (row.status as string | number | null) ?? null,
  };
}

export async function listTransactions(options: {
  resellerKode?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const col = await transaksiMap();
  if (!col.id) throw new Error("transaksi table is missing an id column");

  const select = [
    `${ident(col.id)} AS id`,
    col.tgl ? `${ident(col.tgl)} AS tanggal_entri` : "NULL AS tanggal_entri",
    col.tglStatus ? `${ident(col.tglStatus)} AS tanggal_status` : "NULL AS tanggal_status",
    col.tujuan ? `${ident(col.tujuan)} AS tujuan` : "NULL AS tujuan",
    col.harga ? `${ident(col.harga)} AS nominal` : "NULL AS nominal",
    col.keterangan ? `${ident(col.keterangan)} AS keterangan` : "NULL AS keterangan",
    col.sn ? `${ident(col.sn)} AS serial_number` : "NULL AS serial_number",
    col.kode ? `${ident(col.kode)} AS kode_produk` : "NULL AS kode_produk",
    col.pengirim ? `${ident(col.pengirim)} AS kode_reseller` : "NULL AS kode_reseller",
    col.status ? `${ident(col.status)} AS status` : "NULL AS status",
  ].join(", ");

  const where: string[] = [];
  const params: unknown[] = [];

  if (options.resellerKode && col.pengirim) {
    params.push(options.resellerKode);
    where.push(`${ident(col.pengirim)} = $${params.length}`);
  }

  if (options.search) {
    const q = `%${options.search}%`;
    const searchParts = [`CAST(${ident(col.id)} AS TEXT) ILIKE $${params.length + 1}`];
    params.push(q);
    if (col.tujuan) {
      params.push(q);
      searchParts.push(`${ident(col.tujuan)} ILIKE $${params.length}`);
    }
    if (col.kode) {
      params.push(q);
      searchParts.push(`${ident(col.kode)} ILIKE $${params.length}`);
    }
    if (col.sn) {
      params.push(q);
      searchParts.push(`${ident(col.sn)} ILIKE $${params.length}`);
    }
    where.push(`(${searchParts.join(" OR ")})`);
  }

  params.push(options.limit ?? 30);
  const limitParam = `$${params.length}`;
  params.push(options.offset ?? 0);
  const offsetParam = `$${params.length}`;

  const sql = `
    SELECT ${select}
    FROM ${ident(transaksiTable)}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${col.tgl ? ident(col.tgl) : ident(col.id)} DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const { rows } = await otomax.query(sql, params);
  return rows.map((row) => rowToTransaction(row as Record<string, unknown>));
}

export async function getTransaction(id: string) {
  const col = await transaksiMap();
  if (!col.id) throw new Error("transaksi table is missing an id column");

  const select = [
    `${ident(col.id)} AS id`,
    col.tgl ? `${ident(col.tgl)} AS tanggal_entri` : "NULL AS tanggal_entri",
    col.tglStatus ? `${ident(col.tglStatus)} AS tanggal_status` : "NULL AS tanggal_status",
    col.tujuan ? `${ident(col.tujuan)} AS tujuan` : "NULL AS tujuan",
    col.harga ? `${ident(col.harga)} AS nominal` : "NULL AS nominal",
    col.keterangan ? `${ident(col.keterangan)} AS keterangan` : "NULL AS keterangan",
    col.sn ? `${ident(col.sn)} AS serial_number` : "NULL AS serial_number",
    col.kode ? `${ident(col.kode)} AS kode_produk` : "NULL AS kode_produk",
    col.pengirim ? `${ident(col.pengirim)} AS kode_reseller` : "NULL AS kode_reseller",
    col.status ? `${ident(col.status)} AS status` : "NULL AS status",
  ].join(", ");

  const { rows } = await otomax.query(
    `SELECT ${select} FROM ${ident(transaksiTable)} WHERE CAST(${ident(col.id)} AS TEXT) = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToTransaction(rows[0] as Record<string, unknown>) : null;
}

export async function findReseller(options: { kode?: string; phone?: string }) {
  const col = await resellerMap();
  if (!col.kode) throw new Error("reseller table is missing a kode column");

  const select = [
    `${ident(col.kode)} AS kode`,
    col.nama ? `${ident(col.nama)} AS nama` : "NULL AS nama",
    col.phone ? `${ident(col.phone)} AS phone` : "NULL AS phone",
    col.pin ? `${ident(col.pin)} AS pin` : "NULL AS pin",
    col.aktif ? `${ident(col.aktif)} AS aktif` : "NULL AS aktif",
  ].join(", ");

  if (options.kode) {
    const { rows } = await otomax.query(
      `SELECT ${select} FROM ${ident(resellerTable)} WHERE ${ident(col.kode)} = $1 LIMIT 1`,
      [options.kode],
    );
    return rows[0] ? toReseller(rows[0] as Record<string, unknown>) : null;
  }

  if (options.phone && col.phone) {
    const tail = normalizePhone(options.phone).replace(/\D/g, "").slice(-10);
    const { rows } = await otomax.query(
      `SELECT ${select} FROM ${ident(resellerTable)}
       WHERE regexp_replace(COALESCE(${ident(col.phone)}, ''), '[^0-9]', '', 'g') LIKE '%' || $1
       LIMIT 1`,
      [tail],
    );
    return rows[0] ? toReseller(rows[0] as Record<string, unknown>) : null;
  }

  return null;
}

function toReseller(row: Record<string, unknown>): OtomaxReseller {
  return {
    kode: String(row.kode ?? ""),
    nama: String(row.nama ?? ""),
    phone: String(row.phone ?? ""),
    pin: row.pin == null ? null : String(row.pin),
    aktif: (row.aktif as string | number | boolean | null) ?? null,
  };
}

export function isSuccessStatus(status: string | number | null) {
  if (status == null) return true;
  const value = String(status).toLowerCase();
  return value === "1" || value === "sukses" || value === "success" || value === "true";
}
