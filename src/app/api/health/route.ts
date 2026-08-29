import { NextResponse } from "next/server";

export async function GET() {
  const key = (process.env.WEB_DEV_PRIVATE_KEY || "").replace(/\s+/g, "");
  return NextResponse.json({
    ok: true,
    service: "komplain-transaksi",
    webDevKeyLoaded: key.length > 80,
  });
}
