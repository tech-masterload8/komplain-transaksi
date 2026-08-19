import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { appdb } from "@/lib/db";
import { applySessionCookie, requestIsHttps, signSession, ADMIN_COOKIE } from "@/lib/session";
import { parseStaffRole } from "@/lib/roles";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = (body.username || "").trim();
  const password = (body.password || "").trim();
  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
  }

  const staff = await appdb.query(
    "SELECT id, username, password_hash, name, role FROM staff_users WHERE lower(username) = lower($1) LIMIT 1",
    [username],
  );
  if (!staff.rowCount) {
    return NextResponse.json({ error: "Akun admin tidak ditemukan" }, { status: 401 });
  }

  const row = staff.rows[0];
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return NextResponse.json({ error: "Password salah" }, { status: 401 });

  const role = parseStaffRole(row.role);
  const token = await signSession({
    role,
    kode: `CS:${row.id}`,
    phone: "",
    name: row.name,
    username: row.username,
  });
  const res = NextResponse.json({ ok: true, role, name: row.name, username: row.username });
  applySessionCookie(res, token, ADMIN_COOKIE, requestIsHttps(request));
  return res;
}
