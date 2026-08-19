import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { getTransaction, sameResellerCode } from "@/lib/otomax";

export async function GET(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const params: unknown[] = [];
  const where: string[] = [];

  if (user.role === "agent") {
    params.push(user.kode);
    where.push(`lower(btrim(reseller_kode)) = lower(btrim($${params.length}))`);
  }
  if (status === "selesai") {
    where.push(`status = 'selesai'`);
  } else if (status === "proses") {
    where.push(`status = 'proses'`);
  } else if (status === "berlangsung") {
    where.push(`status IN ('berlangsung', 'proses')`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(
      `(transaction_id ILIKE $${params.length} OR COALESCE(reseller_phone,'') ILIKE $${params.length} OR COALESCE(product_code,'') ILIKE $${params.length} OR COALESCE(last_message,'') ILIKE $${params.length})`,
    );
  }

  const { rows } = await appdb.query(
    `SELECT * FROM conversations
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY COALESCE(last_message_at, created_at) DESC
     LIMIT 100`,
    params,
  );
  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) return error!;

  const body = (await request.json()) as { transactionId?: string; message?: string };
  const transactionId = String(body.transactionId || "").trim();
  const text = String(body.message || "").trim();
  if (!transactionId || !text) {
    return NextResponse.json({ error: "Transaksi dan pesan wajib diisi" }, { status: 400 });
  }

  const trx = await getTransaction(transactionId);
  if (!trx) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  if (user.role === "agent" && trx.kodeReseller && !sameResellerCode(trx.kodeReseller, user.kode)) {
    return NextResponse.json({ error: "Tidak ada akses" }, { status: 403 });
  }

  const resellerKode = user.role === "agent" ? user.kode : trx.kodeReseller;
  const existing = await appdb.query("SELECT * FROM conversations WHERE transaction_id = $1", [transactionId]);

  let conversationId: string;
  if (existing.rowCount) {
    conversationId = existing.rows[0].id;
  } else {
    const created = await appdb.query(
      `INSERT INTO conversations (
         transaction_id, reseller_kode, reseller_phone, product_code,
         status, last_message, last_message_at, ticket_no, updated_at
       )
       VALUES (
         $1, $2, $3, $4, 'berlangsung', $5, NOW(),
         'TKT-' || lpad(nextval('ticket_seq')::text, 6, '0'),
         NOW()
       )
       RETURNING id`,
      [transactionId, resellerKode, user.phone || trx.tujuan, trx.kodeProduk, text],
    );
    conversationId = created.rows[0].id;
  }

  await appdb.query(
    `INSERT INTO messages (conversation_id, sender_role, sender_name, body)
     VALUES ($1, $2, $3, $4)`,
    [conversationId, user.role === "agent" ? "agent" : "cs", user.name, text],
  );
  await appdb.query(
    `UPDATE conversations SET last_message = $1, last_message_at = NOW(), status = 'berlangsung' WHERE id = $2`,
    [text, conversationId],
  );

  return NextResponse.json({ conversationId });
}
