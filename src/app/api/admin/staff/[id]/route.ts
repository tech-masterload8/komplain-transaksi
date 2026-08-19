import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { appdb } from "@/lib/db";
import { requireUserManager } from "@/lib/api-auth";
import { parseStaffRole } from "@/lib/roles";

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

function staffIdFromUser(kode: string) {
  return kode.replace(/^CS:/, "");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUserManager();
  if (error || !user) return error!;
  const { id } = await context.params;
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    name?: string;
    role?: string;
  };

  const current = await appdb.query("SELECT id, username, role FROM staff_users WHERE id = $1", [id]);
  if (!current.rowCount) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

  const nextUsername = body.username != null ? String(body.username).trim() : current.rows[0].username;
  const nextName = body.name != null ? String(body.name).trim() : null;
  const nextRole = body.role != null ? parseStaffRole(body.role, parseStaffRole(current.rows[0].role)) : parseStaffRole(current.rows[0].role);

  if (!USERNAME_RE.test(nextUsername)) {
    return NextResponse.json(
      { error: "Username 3-32 karakter, hanya huruf, angka, titik, garis bawah, atau strip" },
      { status: 400 },
    );
  }

  if (current.rows[0].role === "superadmin" && nextRole !== "superadmin") {
    const count = await appdb.query("SELECT COUNT(*)::int AS n FROM staff_users WHERE role = 'superadmin'");
    if (count.rows[0].n <= 1) {
      return NextResponse.json({ error: "Tidak dapat menurunkan super admin terakhir" }, { status: 400 });
    }
  }

  let passwordHash: string | null = null;
  if (body.password) {
    const password = String(body.password).trim();
    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }
    passwordHash = await bcrypt.hash(password, 10);
  }

  try {
    const { rows } = await appdb.query(
      `UPDATE staff_users SET
         username = $2,
         name = COALESCE($3, name),
         role = $4,
         password_hash = COALESCE($5, password_hash)
       WHERE id = $1
       RETURNING id, username, name, role, created_at`,
      [id, nextUsername, nextName, nextRole, passwordHash],
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

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUserManager();
  if (error || !user) return error!;
  const { id } = await context.params;

  if (id === staffIdFromUser(user.kode)) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
  }

  const current = await appdb.query("SELECT id, role FROM staff_users WHERE id = $1", [id]);
  if (!current.rowCount) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

  if (current.rows[0].role === "superadmin") {
    const count = await appdb.query("SELECT COUNT(*)::int AS n FROM staff_users WHERE role = 'superadmin'");
    if (count.rows[0].n <= 1) {
      return NextResponse.json({ error: "Tidak dapat menghapus super admin terakhir" }, { status: 400 });
    }
  }

  await appdb.query("UPDATE conversations SET assigned_to = NULL WHERE assigned_to = $1", [id]);
  await appdb.query("DELETE FROM staff_users WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
