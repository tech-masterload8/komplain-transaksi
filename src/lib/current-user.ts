import { cookies } from "next/headers";
import { isStaffRole } from "./roles";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, verifySession } from "./session";

export async function currentUser() {
  const jar = await cookies();
  const user = await verifySession(jar.get(CUSTOMER_COOKIE)?.value);
  if (!user || user.role !== "agent") return null;
  return user;
}

export async function currentAdmin() {
  const jar = await cookies();
  const user = await verifySession(jar.get(ADMIN_COOKIE)?.value);
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}
