import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { listTransactions } from "@/lib/otomax";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") || undefined;
  const offset = Number(searchParams.get("offset") || 0);
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);
  const resellerKode = user.role === "agent" ? user.kode : searchParams.get("reseller") || undefined;
  if (user.role === "agent" && !resellerKode) {
    return NextResponse.json({ error: "Kode reseller tidak terbaca" }, { status: 401 });
  }

  try {
    const items = await listTransactions({ resellerKode, search, limit, offset });
    return NextResponse.json({ items, kode: resellerKode || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat transaksi";
    console.error("[api/transaksi]", message);
    return NextResponse.json({ error: message, items: [], kode: resellerKode || null }, { status: 500 });
  }
}
