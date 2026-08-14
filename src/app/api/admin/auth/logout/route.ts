import { NextResponse } from "next/server";
import { ADMIN_COOKIE, clearSessionCookie } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie(ADMIN_COOKIE));
  return res;
}
