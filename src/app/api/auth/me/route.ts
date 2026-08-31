import { NextResponse } from "next/server";
import { ingestAuthorization } from "@/lib/auth";
import { currentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Token sesi lewat header dipakai WebView yang tidak menyimpan cookie.
  const known = await currentUser();
  if (known) {
    return NextResponse.json({ user: { kode: known.kode, name: known.name, phone: known.phone } });
  }

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
