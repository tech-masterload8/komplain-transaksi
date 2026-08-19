import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { sameResellerCode } from "@/lib/otomax";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error || !user) return error!;
  const { id } = await context.params;

  const conv = await appdb.query("SELECT * FROM conversations WHERE id = $1", [id]);
  if (!conv.rowCount) return NextResponse.json({ error: "Chat tidak ditemukan" }, { status: 404 });
  const conversation = conv.rows[0];
  if (user.role === "agent" && !sameResellerCode(conversation.reseller_kode, user.kode)) {
    return NextResponse.json({ error: "Tidak ada akses" }, { status: 403 });
  }

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

  const senderRole = user.role === "agent" ? "agent" : "cs";
  const preview = body || (attachmentPath ? "Lampiran" : "");
  const message = await appdb.query(
    `INSERT INTO messages (conversation_id, sender_role, sender_name, body, attachment_path)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, senderRole, user.name, body, attachmentPath],
  );
  await appdb.query(
    `UPDATE conversations
     SET last_message = $1, last_message_at = NOW(),
         status = CASE WHEN status = 'selesai' THEN 'berlangsung' ELSE status END
     WHERE id = $2`,
    [preview, id],
  );

  return NextResponse.json({ message: message.rows[0] });
}
