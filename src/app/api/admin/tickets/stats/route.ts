import { NextResponse } from "next/server";
import { appdb } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;

  const { rows } = await appdb.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'berlangsung')::int AS baru,
      COUNT(*) FILTER (WHERE status = 'proses')::int AS proses,
      COUNT(*) FILTER (WHERE status = 'selesai')::int AS selesai
    FROM conversations
  `);

  const latest = await appdb.query(
    `SELECT id, ticket_no, transaction_id, reseller_kode, reseller_phone, product_code, status, last_message, last_message_at, created_at
     FROM conversations
     ORDER BY COALESCE(last_message_at, created_at) DESC
     LIMIT 8`,
  );

  return NextResponse.json({ stats: rows[0], latest: latest.rows });
}
