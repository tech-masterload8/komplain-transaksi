import { otomax } from "./db";
import { normalizePhone } from "./format";
import {
  OTOMAX_PENGIRIM_COLUMNS,
  OTOMAX_PRODUK_COLUMNS,
  OTOMAX_RESELLER_COLUMNS,
  OTOMAX_TRX_COLUMNS,
} from "./otomax-schema";

type ColumnMap = Record<string, string>;

let transaksiCols: ColumnMap | null = null;
let resellerCols: ColumnMap | null = null;
let pengirimCols: ColumnMap | null = null;
let produkCols: ColumnMap | null = null;
let transaksiTable = "transaksi";
let resellerTable = "reseller";
let pengirimTable: string | null = null;
let produkTable: string | null = null;
let mappingLogged = false;

async function resolveTable(name: string) {
  const { rows } = await otomax.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND lower(table_name) = lower($1)
     LIMIT 1`,
    [name],
  );
  return rows[0]?.table_name || null;
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

function col(cols: ColumnMap, name: string) {
  return cols[name.toLowerCase()] || null;
}

function must(cols: ColumnMap, table: string, name: string) {
  const found = col(cols, name);
  if (!found) throw new Error(`Kolom ${table}.${name} tidak ada di otomaxbank`);
  return found;
}

function ident(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

function qualify(alias: string, name: string) {
  return `${alias}.${ident(name)}`;
}

export function sameResellerCode(a?: string | null, b?: string | null) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

async function transaksiMap() {
  const table = await resolveTable("transaksi");
  if (!table) throw new Error('Tabel "transaksi" tidak ditemukan di otomaxbank');
  transaksiTable = table;
  if (!transaksiCols) transaksiCols = await columnsFor(transaksiTable);
  const cols = transaksiCols;
  const mapping = {
    id: must(cols, "transaksi", process.env.OTOMAX_TRX_ID_COLUMN || OTOMAX_TRX_COLUMNS.kode),
    tgl: must(cols, "transaksi", process.env.OTOMAX_TRX_DATE_COLUMN || OTOMAX_TRX_COLUMNS.tglEntri),
    tglStatus: col(cols, OTOMAX_TRX_COLUMNS.tglStatus),
    tujuan: col(cols, OTOMAX_TRX_COLUMNS.tujuan),
    harga: col(cols, OTOMAX_TRX_COLUMNS.harga),
    keterangan: col(cols, OTOMAX_TRX_COLUMNS.keterangan),
    sn: col(cols, OTOMAX_TRX_COLUMNS.sn),
    kodeProduk: col(cols, process.env.OTOMAX_TRX_PRODUCT_COLUMN || OTOMAX_TRX_COLUMNS.kodeProduk),
    kodeReseller: must(
      cols,
      "transaksi",
      process.env.OTOMAX_TRX_RESELLER_COLUMN || OTOMAX_TRX_COLUMNS.kodeReseller,
    ),
    pengirim: col(cols, OTOMAX_TRX_COLUMNS.pengirim),
    status: col(cols, OTOMAX_TRX_COLUMNS.status),
  };
  logMappingOnce("transaksi", transaksiTable, cols, mapping);
  return mapping;
}

async function resellerMap() {
  const table = await resolveTable("reseller");
  if (!table) throw new Error('Tabel "reseller" tidak ditemukan di otomaxbank');
  resellerTable = table;
  if (!resellerCols) resellerCols = await columnsFor(resellerTable);
  const cols = resellerCols;
  const mapping = {
    kode: must(cols, "reseller", process.env.OTOMAX_RESELLER_KODE_COLUMN || OTOMAX_RESELLER_COLUMNS.kode),
    nama: col(cols, OTOMAX_RESELLER_COLUMNS.nama),
    phone: col(cols, OTOMAX_RESELLER_COLUMNS.nomorHp),
    aktif: col(cols, OTOMAX_RESELLER_COLUMNS.aktif),
    deleted: col(cols, OTOMAX_RESELLER_COLUMNS.deleted),
  };
  logMappingOnce("reseller", resellerTable, cols, mapping);
  return mapping;
}

async function produkMap() {
  if (produkCols) {
    return {
      table: produkTable,
      kode: produkTable ? col(produkCols, OTOMAX_PRODUK_COLUMNS.kode) : null,
      nama: produkTable ? col(produkCols, OTOMAX_PRODUK_COLUMNS.nama) : null,
    };
  }
  produkTable = await resolveTable("produk");
  produkCols = produkTable ? await columnsFor(produkTable) : {};
  return {
    table: produkTable,
    kode: produkTable ? col(produkCols, OTOMAX_PRODUK_COLUMNS.kode) : null,
    nama: produkTable ? col(produkCols, OTOMAX_PRODUK_COLUMNS.nama) : null,
  };
}

async function pengirimMap() {
  if (pengirimCols) {
    return {
      table: pengirimTable,
      kodeReseller: pengirimTable ? col(pengirimCols, OTOMAX_PENGIRIM_COLUMNS.kodeReseller) : null,
      pengirim: pengirimTable ? col(pengirimCols, OTOMAX_PENGIRIM_COLUMNS.pengirim) : null,
    };
  }
  pengirimTable = await resolveTable("pengirim");
  pengirimCols = pengirimTable ? await columnsFor(pengirimTable) : {};
  return {
    table: pengirimTable,
    kodeReseller: pengirimTable ? col(pengirimCols, OTOMAX_PENGIRIM_COLUMNS.kodeReseller) : null,
    pengirim: pengirimTable ? col(pengirimCols, OTOMAX_PENGIRIM_COLUMNS.pengirim) : null,
  };
}

function logMappingOnce(label: string, table: string, cols: ColumnMap, used: Record<string, string | null>) {
  if (mappingLogged) return;
  console.log(`[otomax] ${label} table=${table} columns=${Object.keys(cols).join(",")}`);
  console.log(`[otomax] ${label} mapping=${JSON.stringify(used)}`);
}

function markMappingLogged() {
  mappingLogged = true;
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
  namaProduk: string;
  kodeReseller: string;
  pengirim: string;
  status: string | number | null;
};

export type OtomaxReseller = {
  kode: string;
  nama: string;
  phone: string;
  pin: string | null;
  aktif: string | number | boolean | null;
};

export type OtomaxSchemaInfo = {
  ok: boolean;
  error?: string;
  transaksi?: { table: string; columns: string[]; mapping: Record<string, string | null> };
  reseller?: { table: string; columns: string[]; mapping: Record<string, string | null> };
  produk?: { table: string | null; columns: string[]; mapping: Record<string, string | null> };
  pengirim?: { table: string | null; columns: string[]; mapping: Record<string, string | null> };
};

export async function inspectOtomaxSchema(): Promise<OtomaxSchemaInfo> {
  try {
    const trx = await transaksiMap();
    const rs = await resellerMap();
    const product = await produkMap();
    const sender = await pengirimMap();
    markMappingLogged();
    return {
      ok: true,
      transaksi: {
        table: transaksiTable,
        columns: Object.keys(transaksiCols || {}),
        mapping: trx,
      },
      reseller: {
        table: resellerTable,
        columns: Object.keys(resellerCols || {}),
        mapping: rs,
      },
      produk: {
        table: product.table,
        columns: Object.keys(produkCols || {}),
        mapping: { kode: product.kode, nama: product.nama },
      },
      pengirim: {
        table: sender.table,
        columns: Object.keys(pengirimCols || {}),
        mapping: { kodeReseller: sender.kodeReseller, pengirim: sender.pengirim },
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

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
    namaProduk: String(row.nama_produk ?? ""),
    kodeReseller: String(row.kode_reseller ?? ""),
    pengirim: String(row.pengirim ?? ""),
    status: (row.status as string | number | null) ?? null,
  };
}

function transaksiSelect(
  col: Awaited<ReturnType<typeof transaksiMap>>,
  product: Awaited<ReturnType<typeof produkMap>>,
) {
  const fields = [
    `${qualify("t", col.id)} AS id`,
    `${qualify("t", col.tgl)} AS tanggal_entri`,
    col.tglStatus ? `${qualify("t", col.tglStatus)} AS tanggal_status` : "NULL AS tanggal_status",
    col.tujuan ? `${qualify("t", col.tujuan)} AS tujuan` : "NULL AS tujuan",
    col.harga ? `${qualify("t", col.harga)} AS nominal` : "NULL AS nominal",
    col.keterangan ? `${qualify("t", col.keterangan)} AS keterangan` : "NULL AS keterangan",
    col.sn ? `${qualify("t", col.sn)} AS serial_number` : "NULL AS serial_number",
    col.kodeProduk ? `${qualify("t", col.kodeProduk)} AS kode_produk` : "NULL AS kode_produk",
    product.table && product.nama ? `${qualify("p", product.nama)} AS nama_produk` : "NULL AS nama_produk",
    `${qualify("t", col.kodeReseller)} AS kode_reseller`,
    col.pengirim ? `${qualify("t", col.pengirim)} AS pengirim` : "NULL AS pengirim",
    col.status ? `${qualify("t", col.status)} AS status` : "NULL AS status",
  ];
  const join =
    product.table && product.kode && col.kodeProduk
      ? `LEFT JOIN ${ident(product.table)} p ON ${qualify("p", product.kode)} = ${qualify("t", col.kodeProduk)}`
      : "";
  return { fields: fields.join(", "), join };
}

export async function listTransactions(options: {
  resellerKode?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const col = await transaksiMap();
  const product = await produkMap();
  markMappingLogged();

  const { fields, join } = transaksiSelect(col, product);
  const where: string[] = [];
  const params: unknown[] = [];

  if (options.resellerKode) {
    params.push(options.resellerKode.trim());
    where.push(`lower(btrim(CAST(${qualify("t", col.kodeReseller)} AS TEXT))) = lower(btrim($${params.length}::text))`);
  }

  if (options.search) {
    const q = `%${options.search}%`;
    const searchParts = [`CAST(${qualify("t", col.id)} AS TEXT) ILIKE $${params.length + 1}`];
    params.push(q);
    if (col.tujuan) {
      params.push(q);
      searchParts.push(`${qualify("t", col.tujuan)} ILIKE $${params.length}`);
    }
    if (col.kodeProduk) {
      params.push(q);
      searchParts.push(`${qualify("t", col.kodeProduk)} ILIKE $${params.length}`);
    }
    if (product.table && product.nama) {
      params.push(q);
      searchParts.push(`${qualify("p", product.nama)} ILIKE $${params.length}`);
    }
    if (col.sn) {
      params.push(q);
      searchParts.push(`${qualify("t", col.sn)} ILIKE $${params.length}`);
    }
    where.push(`(${searchParts.join(" OR ")})`);
  }

  params.push(options.limit ?? 30);
  const limitParam = `$${params.length}`;
  params.push(options.offset ?? 0);
  const offsetParam = `$${params.length}`;

  const sql = `
    SELECT ${fields}
    FROM ${ident(transaksiTable)} t
    ${join}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${qualify("t", col.tgl)} DESC NULLS LAST
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const { rows } = await otomax.query(sql, params);
  return rows.map((row) => rowToTransaction(row as Record<string, unknown>));
}

export async function getTransaction(id: string) {
  const col = await transaksiMap();
  const product = await produkMap();
  const { fields, join } = transaksiSelect(col, product);
  const { rows } = await otomax.query(
    `SELECT ${fields}
     FROM ${ident(transaksiTable)} t
     ${join}
     WHERE CAST(${qualify("t", col.id)} AS TEXT) = $1
     LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToTransaction(rows[0] as Record<string, unknown>) : null;
}

export async function findReseller(options: { kode?: string; phone?: string }) {
  const mapping = await resellerMap();
  markMappingLogged();

  const select = [
    `${ident(mapping.kode)} AS kode`,
    mapping.nama ? `${ident(mapping.nama)} AS nama` : "NULL AS nama",
    mapping.phone ? `${ident(mapping.phone)} AS phone` : "NULL AS phone",
    mapping.aktif ? `${ident(mapping.aktif)} AS aktif` : "NULL AS aktif",
  ].join(", ");

  if (options.kode) {
    const { rows } = await otomax.query(
      `SELECT ${select} FROM ${ident(resellerTable)}
       WHERE lower(btrim(CAST(${ident(mapping.kode)} AS TEXT))) = lower(btrim($1))
       LIMIT 1`,
      [options.kode],
    );
    if (rows[0]) return toReseller(rows[0] as Record<string, unknown>);
  }

  if (options.phone) {
    const byPhone = await findResellerKodeByPhone(options.phone);
    if (byPhone) {
      const { rows } = await otomax.query(
        `SELECT ${select} FROM ${ident(resellerTable)}
         WHERE lower(btrim(CAST(${ident(mapping.kode)} AS TEXT))) = lower(btrim($1))
         LIMIT 1`,
        [byPhone],
      );
      if (rows[0]) {
        const reseller = toReseller(rows[0] as Record<string, unknown>);
        return { ...reseller, phone: reseller.phone || options.phone };
      }
    }
  }

  return null;
}

async function findResellerKodeByPhone(phone: string) {
  const mapping = await resellerMap();
  const tail = normalizePhone(phone).replace(/\D/g, "").slice(-10);
  if (!tail) return null;

  if (mapping.phone) {
    const { rows } = await otomax.query<{ kode: string }>(
      `SELECT CAST(${ident(mapping.kode)} AS TEXT) AS kode FROM ${ident(resellerTable)}
       WHERE regexp_replace(COALESCE(${ident(mapping.phone)}, ''), '[^0-9]', '', 'g') LIKE '%' || $1
       LIMIT 1`,
      [tail],
    );
    if (rows[0]?.kode) return rows[0].kode;
  }

  const sender = await pengirimMap();
  if (sender.table && sender.pengirim && sender.kodeReseller) {
    const { rows } = await otomax.query<{ kode: string }>(
      `SELECT CAST(${ident(sender.kodeReseller)} AS TEXT) AS kode
       FROM ${ident(sender.table)}
       WHERE regexp_replace(COALESCE(${ident(sender.pengirim)}, ''), '[^0-9]', '', 'g') LIKE '%' || $1
       LIMIT 1`,
      [tail],
    );
    if (rows[0]?.kode) return rows[0].kode;
  }

  return null;
}

function toReseller(row: Record<string, unknown>): OtomaxReseller {
  return {
    kode: String(row.kode ?? ""),
    nama: String(row.nama ?? ""),
    phone: String(row.phone ?? ""),
    pin: null,
    aktif: (row.aktif as string | number | boolean | null) ?? null,
  };
}
