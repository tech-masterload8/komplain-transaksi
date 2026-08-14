import { SignJWT, jwtVerify } from "jose";

export type SessionUser = {
  role: "agent" | "cs" | "admin";
  kode: string;
  phone: string;
  name: string;
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
      token: payload.token ? String(payload.token) : undefined,
    };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, cookieName = CUSTOMER_COOKIE) {
  const secure = process.env.NODE_ENV === "production";
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
