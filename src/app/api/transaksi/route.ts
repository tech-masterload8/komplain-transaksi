import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { listTransactions } from "@/lib/otomax";

export async function GET(request: Request) {
  const { user, error } = await requireUser();
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") || undefined;
  const offset = Number(searchParams.get("offset") || 0);
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);
  const resellerKode = user.role === "agent" ? user.kode : searchParams.get("reseller") || undefined;

  const items = await listTransactions({ resellerKode, search, limit, offset });
  return NextResponse.json({ items });
}
