import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { getTransaction } from "@/lib/otomax";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error || !user) return error!;
  const { id } = await context.params;

  const conv = await appdb.query("SELECT * FROM conversations WHERE id = $1", [id]);
  if (!conv.rowCount) return NextResponse.json({ error: "Chat tidak ditemukan" }, { status: 404 });
  const conversation = conv.rows[0];
  if (user.role === "agent" && conversation.reseller_kode !== user.kode) {
    return NextResponse.json({ error: "Tidak ada akses" }, { status: 403 });
  }

  const messages = await appdb.query(
    "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [id],
  );
  const trx = await getTransaction(conversation.transaction_id);
  return NextResponse.json({ conversation, messages: messages.rows, transaction: trx });
}
