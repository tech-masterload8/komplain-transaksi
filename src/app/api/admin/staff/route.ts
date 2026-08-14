import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { appdb } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  const { rows } = await appdb.query(
    "SELECT id, phone, name, role, created_at FROM staff_users ORDER BY created_at ASC",
  );
  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const { user, error } = await requireStaff();
  if (error || !user) return error!;
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat menambah staf" }, { status: 403 });
  }

  const body = (await request.json()) as { phone?: string; pin?: string; name?: string; role?: string };
  const phone = String(body.phone || "").trim();
  const pin = String(body.pin || "").trim();
  const name = String(body.name || "").trim();
  const role = body.role === "admin" ? "admin" : "cs";
  if (!phone || !pin || !name) {
    return NextResponse.json({ error: "Nama, nomor, dan PIN wajib diisi" }, { status: 400 });
  }

  const hash = await bcrypt.hash(pin, 10);
  const { rows } = await appdb.query(
    `INSERT INTO staff_users (phone, pin_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, name = EXCLUDED.name, role = EXCLUDED.role
     RETURNING id, phone, name, role, created_at`,
    [phone, hash, name, role],
  );
  return NextResponse.json({ item: rows[0] });
}
