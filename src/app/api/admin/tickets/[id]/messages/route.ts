import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  const { id } = await context.params;

  const conv = await appdb.query("SELECT id, status FROM conversations WHERE id = $1", [id]);
  if (!conv.rowCount) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

  const form = await request.formData();
  const body = String(form.get("body") || "").trim();
  const file = form.get("file");
  let attachmentPath: string | null = null;

  if (file && file instanceof File && file.size > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const ext = path.extname(file.name || "") || "";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
    attachmentPath = `/uploads/${filename}`;
  }

  if (!body && !attachmentPath) {
    return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
  }

  const preview = body || "Lampiran";
  const message = await appdb.query(
    `INSERT INTO messages (conversation_id, sender_role, sender_name, body, attachment_path)
     VALUES ($1, 'cs', $2, $3, $4)
     RETURNING *`,
    [id, user.name, body, attachmentPath],
  );

  await appdb.query(
    `UPDATE conversations
     SET last_message = $1,
         last_message_at = NOW(),
         updated_at = NOW(),
         status = CASE WHEN status = 'selesai' THEN 'proses' ELSE status END,
         assigned_to = COALESCE(assigned_to, $3::uuid),
         assigned_name = COALESCE(assigned_name, $4),
         closed_at = CASE WHEN status = 'selesai' THEN NULL ELSE closed_at END
     WHERE id = $2`,
    [preview, id, user.kode.replace(/^CS:/, ""), user.name],
  );

  return NextResponse.json({ message: message.rows[0] });
}
