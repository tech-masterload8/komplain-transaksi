import TransaksiList from "@/components/customer/TransaksiList";
import { currentUser } from "@/lib/current-user";
import { toAgentProfile } from "@/lib/agent-profile";
import { loadTransaksiView } from "@/lib/transaksi-data";

export const dynamic = "force-dynamic";

export default async function TransaksiPage() {
  const user = await currentUser();

  // Tanpa sesi di server (WebView tanpa cookie) halaman tetap dirender, lalu
  // daftarnya diambil dari klien memakai token sesi yang tersimpan.
  if (!user) {
    return <TransaksiList initialItems={[]} user={null} />;
  }

  const { items, error } = await loadTransaksiView(user);

  return <TransaksiList initialItems={items} initialError={error} user={toAgentProfile(user)} />;
}
