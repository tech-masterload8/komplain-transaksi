import { headers } from "next/headers";
import AgentEntry from "@/components/AgentEntry";
import TransaksiList from "@/components/customer/TransaksiList";
import { currentUser, customerCookieSent } from "@/lib/current-user";
import { toAgentProfile } from "@/lib/agent-profile";
import type { AuthIngestReason } from "@/lib/auth-reason";
import { decodeAuthDebugHeader, formatAuthDebugDump } from "@/lib/auth-debug";
import { loadTransaksiView } from "@/lib/transaksi-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();

  // Tutorial: header Android hanya ada di request pertama. Render daftar di
  // request yang sama, jangan redirect ke /transaksi yang bisa di-cache proxy.
  if (user) {
    const { items, error } = await loadTransaksiView(user);
    return <TransaksiList initialItems={items} initialError={error} user={toAgentProfile(user)} />;
  }

  const incoming = await headers();
  const reason = (incoming.get("x-kt-auth-reason") || "no-header") as AuthIngestReason;
  const debug = decodeAuthDebugHeader(incoming.get("x-kt-auth-debug"));
  return (
    <AgentEntry
      authReason={reason}
      cookieSent={await customerCookieSent()}
      debugDump={debug ? formatAuthDebugDump(debug) : ""}
    />
  );
}
