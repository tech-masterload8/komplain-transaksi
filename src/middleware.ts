import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, CUSTOMER_COOKIE } from "@/lib/session";

function isPublic(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/api/health" ||
    pathname === "/api/auth/me" ||
    pathname === "/api/auth/login" ||
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname === "/favicon.ico"
  );
}

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
 * dari .env Docker. Verifikasi tanda tangan di sini pernah menolak semua sesi
 * dan memantulkan halaman pelanggan ke beranda, jadi di sini hanya cek bentuk
 * dan masa berlaku cookie. Tanda tangan tetap diperiksa oleh currentUser()
 * dan requireUser() yang jalan di Node.
 */
function hasUsableSession(request: NextRequest, name: string) {
  const token = request.cookies.get(name)?.value;
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.role || !payload.kode) return false;
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  return exp === 0 || exp * 1000 > Date.now();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (hasUsableSession(request, isAdminPath ? ADMIN_COOKIE : CUSTOMER_COOKIE)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Tidak memiliki akses" }, { status: 401 });
  }
  const login = request.nextUrl.clone();
  login.pathname = isAdminPath ? "/admin/login" : "/";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
