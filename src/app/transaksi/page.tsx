import { redirect } from "next/navigation";
import TransaksiList from "@/components/customer/TransaksiList";
import { currentUser } from "@/lib/current-user";
import { loadTransaksiView } from "@/lib/transaksi-data";

export const dynamic = "force-dynamic";

export default async function TransaksiPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const { items, error } = await loadTransaksiView(user);

  return (
    <TransaksiList
      initialItems={items}
      initialError={error}
      user={{ kode: user.kode, name: user.name || user.kode, phone: user.phone }}
    />
  );
}
