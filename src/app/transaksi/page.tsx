"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MessageCircle, Search } from "lucide-react";
import PhoneShell from "@/components/PhoneShell";
import { CircleIconButton } from "@/components/CircleIconButton";
import { formatDateTime, truncate, isSuccessStatus } from "@/lib/format";

type Trx = {
  id: string;
  tanggalEntri: string | null;
  tujuan: string;
  kodeProduk: string;
  status: string | number | null;
};

export default function TransaksiList() {
  const router = useRouter();
  const [items, setItems] = useState<Trx[]>([]);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(reset = true) {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("offset", reset ? "0" : String(items.length));
    const res = await fetch(`/api/transaksi?${params.toString()}`);
    if (res.status === 401) {
      router.replace("/");
      return;
    }
    const data = await res.json();
    setItems(reset ? data.items : [...items, ...data.items]);
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col px-5 pb-8 pt-6">
        <header className="mb-5 flex items-center justify-between">
          <h1 className="text-[34px] font-extrabold tracking-tight">Transaksi</h1>
          <div className="flex gap-2">
            <CircleIconButton onClick={() => setSearchOpen((v) => !v)}>
              <Search size={18} />
            </CircleIconButton>
            <CircleIconButton href="/chat">
              <MessageCircle size={18} />
            </CircleIconButton>
          </div>
        </header>

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

        <div className="flex flex-1 flex-col gap-3">
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
                <p className="truncate text-sm text-zinc-400">{truncate(item.kodeProduk || "-", 16)}</p>
              </div>
            </button>
          ))}
          {!loading && items.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-400">Belum ada transaksi.</p>
          ) : null}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => load(false)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white"
            aria-label="Muat lebih banyak"
          >
            <ChevronDown size={22} />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
