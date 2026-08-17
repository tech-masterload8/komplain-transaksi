import { NextResponse } from "next/server";
import { applyClearCookie, CUSTOMER_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  applyClearCookie(res, CUSTOMER_COOKIE);
  return res;
}
