import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const { user, error } = await requireUser();
  if (error || !user) return error!;
  const { rows } = await appdb.query(
    "SELECT id, label FROM message_shortcuts WHERE active = TRUE ORDER BY sort_order ASC, id ASC",
  );
  return NextResponse.json({ items: rows });
}
