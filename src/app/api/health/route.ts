import { NextRequest, NextResponse } from "next/server";
import { describeAuthorization, joinHeaderValue, normalizeWebDevPrivateKey } from "@/lib/decrypt";

export async function GET(request: NextRequest) {
  const key = normalizeWebDevPrivateKey(process.env.WEB_DEV_PRIVATE_KEY);
  const authorization =
    joinHeaderValue(request.headers.get("authorization") || undefined) ||
    joinHeaderValue(request.headers.get("x-authorization") || undefined);
  const reason = request.headers.get("x-kt-auth-reason");
  return NextResponse.json({
    ok: true,
    service: "komplain-transaksi",
    gitSha: process.env.KT_GIT_SHA || "unknown",
    webDevKeyLoaded: key.length > 80,
    authReason: reason || undefined,
    authorization: describeAuthorization(authorization),
  });
}
