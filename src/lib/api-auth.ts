import { currentAdmin, currentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { canDeleteRecords, canManageUsers } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

export async function requireUser() {
  return requireAgent();
}

export async function requireAgent() {
  const user = await currentUser();
  if (!user) {
    return {
      user: null as SessionUser | null,
      error: NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

export async function requireStaff() {
  const user = await currentAdmin();
  if (!user) {
    return {
      user: null as SessionUser | null,
      error: NextResponse.json({ error: "Silakan masuk sebagai admin" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

export async function requireUserManager() {
  const result = await requireStaff();
  if (result.error || !result.user) return result;
  if (!canManageUsers(result.user.role)) {
    return {
      user: result.user,
      error: NextResponse.json({ error: "Hanya super admin yang dapat mengelola pengguna" }, { status: 403 }),
    };
  }
  return result;
}

export async function requireRecordDeleter() {
  const result = await requireStaff();
  if (result.error || !result.user) return result;
  if (!canDeleteRecords(result.user.role)) {
    return {
      user: result.user,
      error: NextResponse.json({ error: "Hanya super admin yang dapat menghapus data" }, { status: 403 }),
    };
  }
  return result;
}
