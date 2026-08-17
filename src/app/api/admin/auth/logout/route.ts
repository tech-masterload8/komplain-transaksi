import { NextResponse } from "next/server";
import { ADMIN_COOKIE, applyClearCookie } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  applyClearCookie(res, ADMIN_COOKIE);
  return res;
}
