import { cookies, headers } from "next/headers";
import { isStaffRole } from "./roles";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, verifySession } from "./session";
import { SESSION_HEADER } from "./session-header";

export async function currentUser() {
  const jar = await cookies();
  const fromCookie = await verifySession(jar.get(CUSTOMER_COOKIE)?.value);
  if (fromCookie?.role === "agent") return fromCookie;

  // Cadangan untuk WebView yang tidak menyimpan cookie.
  const incoming = await headers();
  const fromHeader = await verifySession(incoming.get(SESSION_HEADER));
  if (fromHeader?.role === "agent") return fromHeader;

  return null;
}

export async function currentAdmin() {
  const jar = await cookies();
  const user = await verifySession(jar.get(ADMIN_COOKIE)?.value);
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}

/** Apakah browser mengirim cookie sesi, terlepas dari sah atau tidak. */
export async function customerCookieSent() {
  const jar = await cookies();
  return Boolean(jar.get(CUSTOMER_COOKIE)?.value);
}
