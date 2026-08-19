import { SignJWT, jwtVerify } from "jose";
import type { SessionRole } from "./roles";

export type SessionUser = {
  role: SessionRole;
  kode: string;
  phone: string;
  name: string;
  username?: string;
  token?: string;
};

export const CUSTOMER_COOKIE = "kt_session";
export const ADMIN_COOKIE = "kt_admin";
export const SESSION_COOKIE = CUSTOMER_COOKIE;

const MAX_AGE = 60 * 60 * 8;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.role || !payload.kode) return null;
    return {
      role: payload.role as SessionUser["role"],
      kode: String(payload.kode),
      phone: String(payload.phone || ""),
      name: String(payload.name || ""),
      username: payload.username ? String(payload.username) : undefined,
      token: payload.token ? String(payload.token) : undefined,
    };
  } catch {
    return null;
  }
}

export function requestIsHttps(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
    secure,
  };
}

export function applySessionCookie(
  res: { cookies: { set: (name: string, value: string, options: ReturnType<typeof cookieOptions>) => unknown } },
  token: string,
  cookieName: string,
  secure: boolean,
) {
  res.cookies.set(cookieName, token, cookieOptions(secure));
}

export function applyClearCookie(
  res: { cookies: { set: (name: string, value: string, options: ReturnType<typeof cookieOptions>) => unknown } },
  cookieName: string,
) {
  res.cookies.set(cookieName, "", { ...cookieOptions(false), maxAge: 0 });
}

export function sessionCookie(token: string, cookieName = CUSTOMER_COOKIE, secure = false) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(cookieName = CUSTOMER_COOKIE) {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readNamedCookie(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readSessionCookie(cookieHeader: string | undefined) {
  return readNamedCookie(cookieHeader, CUSTOMER_COOKIE);
}
