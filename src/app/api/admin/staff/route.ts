import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { appdb } from "@/lib/db";
import { requireUserManager } from "@/lib/api-auth";
import { parseStaffRole } from "@/lib/roles";

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

export async function GET() {
  const { user, error } = await requireUserManager();
  if (error || !user) return error!;
  const { rows } = await appdb.query(
    "SELECT id, username, name, role, created_at FROM staff_users ORDER BY created_at ASC",
  );
  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  const { user, error } = await requireUserManager();
  if (error || !user) return error!;

  const body = (await request.json()) as {
    username?: string;
    password?: string;
    name?: string;
    role?: string;
  };
  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();
  const name = String(body.name || "").trim();
  const role = parseStaffRole(body.role, "cs");

  if (!username || !password || !name) {
    return NextResponse.json({ error: "Nama, username, dan password wajib diisi" }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username 3-32 karakter, hanya huruf, angka, titik, garis bawah, atau strip" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await appdb.query(
      `INSERT INTO staff_users (username, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, name, role, created_at`,
      [username, hash, name, role],
    );
    return NextResponse.json({ item: rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("staff_users_username") || message.includes("unique")) {
      return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
    }
    throw err;
  }
}
