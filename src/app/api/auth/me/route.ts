import { NextResponse } from "next/server";
import { ingestAuthorization } from "@/lib/auth";

export async function GET(request: Request) {
  const ingested = await ingestAuthorization({
    headers: {
      cookie: request.headers.get("cookie") || undefined,
      authorization: request.headers.get("authorization") || request.headers.get("x-authorization") || undefined,
      "x-forwarded-proto": request.headers.get("x-forwarded-proto") || undefined,
    },
  });
  const user = ingested.user?.role === "agent" ? ingested.user : null;
  const res = NextResponse.json(
    user ? { user: { kode: user.kode, name: user.name, phone: user.phone } } : { user: null },
    { status: user ? 200 : 401 },
  );
  if (ingested.setCookie) res.headers.append("Set-Cookie", ingested.setCookie);
  return res;
}
