import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireRecordDeleter, requireStaff } from "@/lib/api-auth";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  const { rows } = await appdb.query(
    "SELECT id, label, sort_order, active FROM message_shortcuts ORDER BY sort_order ASC, id ASC",
  );
  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  const body = (await request.json()) as { label?: string };
  const label = String(body.label || "").trim();
  if (!label) return NextResponse.json({ error: "Teks shortcut wajib diisi" }, { status: 400 });
  const { rows } = await appdb.query(
    `INSERT INTO message_shortcuts (label, sort_order)
     VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM message_shortcuts))
     RETURNING *`,
    [label],
  );
  return NextResponse.json({ item: rows[0] });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  const body = (await request.json()) as { id?: number; active?: boolean; label?: string };
  if (!body.id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
  const { rows } = await appdb.query(
    `UPDATE message_shortcuts
     SET active = COALESCE($2, active), label = COALESCE($3, label)
     WHERE id = $1
     RETURNING *`,
    [body.id, body.active ?? null, body.label || null],
  );
  return NextResponse.json({ item: rows[0] });
}

export async function DELETE(request: Request) {
  const { user, error } = await requireRecordDeleter();
  if (error || !user) return error!;
  const body = (await request.json()) as { id?: number };
  if (!body.id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
  await appdb.query("DELETE FROM message_shortcuts WHERE id = $1", [body.id]);
  return NextResponse.json({ ok: true });
}
