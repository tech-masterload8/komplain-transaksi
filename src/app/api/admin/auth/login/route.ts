import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { appdb } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { ADMIN_COOKIE, sessionCookie, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string; pin?: string };
  const phone = (body.phone || "").trim();
  const pin = (body.pin || "").trim();
  if (!phone || !pin) {
    return NextResponse.json({ error: "Nomor handphone dan PIN wajib diisi" }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  const noZero = normalized.startsWith("0") ? normalized.slice(1) : normalized;
  const variants = Array.from(new Set([phone.replace(/\D/g, ""), normalized, `62${noZero}`, noZero]));

  const staff = await appdb.query(
    "SELECT id, phone, pin_hash, name, role FROM staff_users WHERE regexp_replace(phone, '[^0-9]', '', 'g') = ANY($1) LIMIT 1",
    [variants],
  );
  if (!staff.rowCount) {
    return NextResponse.json({ error: "Akun admin tidak ditemukan" }, { status: 401 });
  }

  const row = staff.rows[0];
  const ok = await bcrypt.compare(pin, row.pin_hash);
  if (!ok) return NextResponse.json({ error: "PIN salah" }, { status: 401 });

  const token = await signSession({
    role: row.role === "admin" ? "admin" : "cs",
    kode: `CS:${row.id}`,
    phone: row.phone,
    name: row.name,
  });
  const res = NextResponse.json({ ok: true, role: row.role, name: row.name });
  res.headers.set("Set-Cookie", sessionCookie(token, ADMIN_COOKIE));
  return res;
}
