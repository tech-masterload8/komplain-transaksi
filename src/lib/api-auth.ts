import { NextResponse } from "next/server";
import { currentAdmin, currentUser } from "@/lib/current-user";
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
