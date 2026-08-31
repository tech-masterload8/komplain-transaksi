import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/session";

function decodeJwtPayload(token: string) {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Middleware berjalan di Edge runtime yang tidak selalu melihat SESSION_SECRET
 * dari .env Docker, jadi di sini hanya cek bentuk dan masa berlaku cookie.
 * Tanda tangan diperiksa currentAdmin() yang jalan di Node.
 */
function hasAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.role || !payload.kode) return false;
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  return exp === 0 || exp * 1000 > Date.now();
}

/**
 * Halaman pelanggan tidak dijaga di sini. WebView APK tidak menyimpan cookie,
 * sehingga penjagaan berbasis cookie memantulkan semua navigasi ke beranda.
 * Otorisasi sebenarnya ada di requireUser() pada setiap route API, yang juga
 * menerima token sesi lewat header.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin") && pathname !== "/api/admin/auth/login";
  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  if (hasAdminSession(request)) return NextResponse.next();

  if (isAdminApi) {
    return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });
  }
  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
