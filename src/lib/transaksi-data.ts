import { listTransactions, type OtomaxTransaction } from "./otomax";
import type { SessionUser } from "./session";

export type TransaksiViewProps = {
  items: OtomaxTransaction[];
  error: string | null;
};

export async function loadTransaksiView(user: SessionUser): Promise<TransaksiViewProps> {
  try {
    const items = await listTransactions({ resellerKode: user.kode, limit: 30, offset: 0 });
    return { items, error: null };
  } catch (err) {
    console.error("[transaksi] list failed", err);
    return { items: [], error: err instanceof Error ? err.message : "Gagal memuat transaksi" };
  }
}
