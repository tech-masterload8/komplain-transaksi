"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MessageCircle, Search } from "lucide-react";
import PhoneShell from "@/components/PhoneShell";
import { CircleIconButton } from "@/components/CircleIconButton";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { useAgent } from "@/components/customer/useAgent";
import type { AgentProfile } from "@/lib/agent-profile";
import { apiFetch } from "@/lib/client-session";
import { formatDateTime, truncate, isSuccessStatus } from "@/lib/format";
import { apiUrl } from "@/lib/paths";

export type TrxItem = {
  id: string;
  tanggalEntri: string | null;
  tujuan: string;
  kodeProduk: string;
  namaProduk?: string;
  status: string | number | null;
};

export default function TransaksiList({
  initialItems,
  initialError,
  user: userProp,
}: {
  initialItems: TrxItem[];
  initialError?: string | null;
  user?: AgentProfile | null;
}) {
  const router = useRouter();
  const { user } = useAgent(userProp);
  const [items, setItems] = useState<TrxItem[]>(initialItems);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(initialItems.length === 0 && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);
  const fetchedOnMount = useRef(false);

  async function load(reset = true) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("offset", reset ? "0" : String(items.length));
      const res = await apiFetch(apiUrl(`/api/transaksi?${params.toString()}`));
      const data = (await res.json().catch(() => ({}))) as { items?: TrxItem[]; error?: string };
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Sesi tidak terbaca. Tutup menu Website, lalu buka lagi dari APK."
            : data.error || "Gagal memuat transaksi",
        );
        if (reset) setItems([]);
        return;
      }
      setItems(reset ? data.items || [] : [...items, ...(data.items || [])]);
    } catch {
      setError("Tidak bisa memuat daftar transaksi. Coba buka ulang menu Website.");
    } finally {
      setLoading(false);
    }
  }

  // Server tidak selalu punya sesi (WebView tanpa cookie), jadi ambil dari
  // klien memakai token sesi yang tersimpan.
  useEffect(() => {
    if (fetchedOnMount.current) return;
    fetchedOnMount.current = true;
    if (initialItems.length === 0 && !initialError) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col px-5 pb-8 pt-6">
        <CustomerHeader
          title="Transaksi"
          user={userProp}
          extra={
            <>
              <CircleIconButton onClick={() => setSearchOpen((v) => !v)}>
                <Search size={18} />
              </CircleIconButton>
              <CircleIconButton href="/chat">
                <MessageCircle size={18} />
              </CircleIconButton>
            </>
          }
        />

        {searchOpen ? (
          <form
            className="mb-4"
            onSubmit={(e) => {
              e.preventDefault();
              load(true);
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ID, nomor, atau produk"
              className="w-full rounded-full border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </form>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex flex-1 flex-col gap-3">
          {loading && items.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-400">Memuat transaksi...</p>
          ) : null}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(`/transaksi/${item.id}`)}
              className="flex items-center gap-3 rounded-[22px] border border-zinc-100 bg-white px-4 py-3.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isSuccessStatus(item.status) ? "bg-emerald-400 text-white" : "bg-amber-400 text-white"
                }`}
              >
                <Check size={18} strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{item.id}</p>
                <p className="text-sm text-zinc-400">{formatDateTime(item.tanggalEntri)}</p>
              </div>
              <div className="min-w-0 text-right">
                <p className="truncate font-semibold">{item.tujuan}</p>
                <p className="truncate text-sm text-zinc-400">
                  {truncate(item.namaProduk || item.kodeProduk || "-", 16)}
                </p>
              </div>
            </button>
          ))}
          {!loading && items.length === 0 && !error ? (
            <p className="py-16 text-center text-sm text-zinc-400">
              Belum ada transaksi untuk {user?.kode || "akun ini"}.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => load(false)}
            disabled={loading}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white disabled:opacity-50"
            aria-label="Muat lebih banyak"
          >
            <ChevronDown size={22} />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
