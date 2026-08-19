export type StaffRole = "cs" | "admin" | "superadmin";
export type SessionRole = "agent" | StaffRole;

export const STAFF_ROLES: StaffRole[] = ["cs", "admin", "superadmin"];

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "cs" || role === "admin" || role === "superadmin";
}

export function canManageUsers(role: string | null | undefined) {
  return role === "superadmin";
}

export function canDeleteRecords(role: string | null | undefined) {
  return role === "superadmin";
}

export function labelRole(role: string | null | undefined) {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "cs") return "CS";
  if (role === "agent") return "Reseller";
  return role || "-";
}

export function parseStaffRole(value: string | null | undefined, fallback: StaffRole = "cs"): StaffRole {
  return isStaffRole(value) ? value : fallback;
}
