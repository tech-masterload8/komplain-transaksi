import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/current-user";
import { canManageUsers } from "@/lib/roles";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAdmin();
  if (!user || !canManageUsers(user.role)) redirect("/admin");
  return children;
}
