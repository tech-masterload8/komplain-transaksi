import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireRecordDeleter, requireStaff } from "@/lib/api-auth";
import { getTransaction } from "@/lib/otomax";
import { labelStatusTiket } from "@/lib/format";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  const { id } = await context.params;

  const conv = await appdb.query("SELECT * FROM conversations WHERE id = $1", [id]);
  if (!conv.rowCount) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

  const messages = await appdb.query(
    "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [id],
  );
  const trx = await getTransaction(conv.rows[0].transaction_id);
  return NextResponse.json({ ticket: conv.rows[0], messages: messages.rows, transaction: trx });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    priority?: string;
    assignToMe?: boolean;
  };

  const current = await appdb.query("SELECT * FROM conversations WHERE id = $1", [id]);
  if (!current.rowCount) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

  const nextStatus = body.status;
  if (nextStatus && !["berlangsung", "proses", "selesai"].includes(nextStatus)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const updated = await appdb.query(
    `UPDATE conversations SET
       status = COALESCE($1, status),
       priority = COALESCE($2, priority),
       assigned_to = CASE WHEN $3 THEN $4::uuid ELSE assigned_to END,
       assigned_name = CASE WHEN $3 THEN $5 ELSE assigned_name END,
       closed_at = CASE
         WHEN COALESCE($1, status) = 'selesai' THEN NOW()
         WHEN $1 IN ('berlangsung', 'proses') THEN NULL
         ELSE closed_at
       END,
       updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      nextStatus || null,
      body.priority || null,
      Boolean(body.assignToMe),
      user.kode.replace(/^CS:/, ""),
      user.name,
      id,
    ],
  );

  if (nextStatus && nextStatus !== current.rows[0].status) {
    await appdb.query(
      `INSERT INTO messages (conversation_id, sender_role, sender_name, body)
       VALUES ($1, 'system', $2, $3)`,
      [id, user.name, `${user.name} mengubah status tiket menjadi ${labelStatusTiket(nextStatus)}.`],
    );
  }

  return NextResponse.json({ ticket: updated.rows[0] });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRecordDeleter();
  if (error || !user) return error!;
  const { id } = await context.params;
  const deleted = await appdb.query("DELETE FROM conversations WHERE id = $1 RETURNING id", [id]);
  if (!deleted.rowCount) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
