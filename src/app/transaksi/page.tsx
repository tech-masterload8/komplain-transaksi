import { redirect } from "next/navigation";
import TransaksiList from "@/components/customer/TransaksiList";
import { currentUser } from "@/lib/current-user";
import { listTransactions } from "@/lib/otomax";

export const dynamic = "force-dynamic";

export default async function TransaksiPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  let items: Awaited<ReturnType<typeof listTransactions>> = [];
  let error: string | null = null;
  try {
    items = await listTransactions({ resellerKode: user.kode, limit: 30, offset: 0 });
  } catch (err) {
    error = err instanceof Error ? err.message : "Gagal memuat transaksi";
    console.error("[transaksi] list failed", err);
  }

  return (
    <TransaksiList
      initialItems={items}
      initialError={error}
      user={{ kode: user.kode, name: user.name || user.kode, phone: user.phone }}
    />
  );
}
