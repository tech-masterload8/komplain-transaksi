import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { currentAdmin } from "@/lib/current-user";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  return <AdminShell name={user.name}>{children}</AdminShell>;
}
