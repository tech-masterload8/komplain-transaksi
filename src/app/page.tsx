import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AgentEntry from "@/components/AgentEntry";
import { currentUser } from "@/lib/current-user";
import type { AuthIngestReason } from "@/lib/auth-reason";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect("/transaksi");
  const reason = ((await headers()).get("x-kt-auth-reason") || "no-header") as AuthIngestReason;
  return <AgentEntry authReason={reason} />;
}
