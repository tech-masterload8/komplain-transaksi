import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getTransaction, sameResellerCode } from "@/lib/otomax";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error || !user) return error!;

  const { id } = await context.params;
  const item = await getTransaction(id);
  if (!item) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  if (user.role === "agent" && item.kodeReseller && !sameResellerCode(item.kodeReseller, user.kode)) {
    return NextResponse.json({ error: "Tidak ada akses" }, { status: 403 });
  }
  return NextResponse.json({ item });
}
