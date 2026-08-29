import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AgentEntry from "@/components/AgentEntry";
import { currentUser } from "@/lib/current-user";
import type { AuthIngestReason } from "@/lib/auth-reason";
import { decodeAuthDebugHeader, formatAuthDebugDump } from "@/lib/auth-debug";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect("/transaksi");
  const incoming = await headers();
  const reason = (incoming.get("x-kt-auth-reason") || "no-header") as AuthIngestReason;
  const debug = decodeAuthDebugHeader(incoming.get("x-kt-auth-debug"));
  return <AgentEntry authReason={reason} debugDump={debug ? formatAuthDebugDump(debug) : ""} />;
}
