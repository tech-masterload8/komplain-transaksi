import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
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

async function hasValidCookie(request: NextRequest, name: string) {
  const token = request.cookies.get(name)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || ""));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const ok = await hasValidCookie(request, isAdminPath ? ADMIN_COOKIE : CUSTOMER_COOKIE);

  if (ok) return NextResponse.next();

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
