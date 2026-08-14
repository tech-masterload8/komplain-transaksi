import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const params: unknown[] = [];
  const where: string[] = [];

  if (status && ["berlangsung", "proses", "selesai"].includes(status)) {
    where.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(
      `(COALESCE(ticket_no,'') ILIKE $${params.length}
        OR transaction_id ILIKE $${params.length}
        OR reseller_kode ILIKE $${params.length}
        OR COALESCE(reseller_phone,'') ILIKE $${params.length}
        OR COALESCE(product_code,'') ILIKE $${params.length}
        OR COALESCE(last_message,'') ILIKE $${params.length})`,
    );
  }

  const { rows } = await appdb.query(
    `SELECT *
     FROM conversations
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY CASE status WHEN 'berlangsung' THEN 0 WHEN 'proses' THEN 1 ELSE 2 END,
              COALESCE(last_message_at, created_at) DESC
     LIMIT 200`,
    params,
  );
  return NextResponse.json({ items: rows });
}
