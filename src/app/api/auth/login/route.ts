import { NextResponse } from "next/server";
import { findReseller } from "@/lib/otomax";
import { CUSTOMER_COOKIE, sessionCookie, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string; pin?: string };
  const phone = (body.phone || "").trim();
  const pin = (body.pin || "").trim();
  if (!phone || !pin) {
    return NextResponse.json({ error: "Nomor handphone dan PIN wajib diisi" }, { status: 400 });
  }

  const reseller = await findReseller({ phone });
  if (!reseller || reseller.pin == null || String(reseller.pin) !== pin) {
    if (process.env.ALLOW_DEV_LOGIN === "true" && process.env.DEV_AGENT_CODE) {
      const token = await signSession({
        role: "agent",
        kode: process.env.DEV_AGENT_CODE,
        phone,
        name: "Agen Uji",
      });
      const res = NextResponse.json({ ok: true, role: "agent", dev: true });
      res.headers.set("Set-Cookie", sessionCookie(token, CUSTOMER_COOKIE));
      return res;
    }
    return NextResponse.json({ error: "Nomor atau PIN tidak sesuai" }, { status: 401 });
  }

  const token = await signSession({
    role: "agent",
    kode: reseller.kode,
    phone: reseller.phone || phone,
    name: reseller.nama || reseller.kode,
  });
  const res = NextResponse.json({ ok: true, role: "agent" });
  res.headers.set("Set-Cookie", sessionCookie(token, CUSTOMER_COOKIE));
  return res;
}
