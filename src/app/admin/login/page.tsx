import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { currentAdmin } from "@/lib/current-user";

export default async function AdminLoginPage() {
  const user = await currentAdmin();
  if (user) redirect("/admin");
  return <AdminLoginForm />;
}
