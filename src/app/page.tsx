import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { currentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect("/transaksi");
  return <LoginForm />;
}
