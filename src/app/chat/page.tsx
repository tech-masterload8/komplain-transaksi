"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import PhoneShell from "@/components/PhoneShell";
import { CircleIconButton } from "@/components/CircleIconButton";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { formatTime, truncate } from "@/lib/format";
import { apiFetch } from "@/lib/client-session";
import { apiUrl } from "@/lib/paths";

type Conversation = {
  id: string;
  ticket_no?: string | null;
  transaction_id: string;
  reseller_phone: string | null;
  product_code: string | null;
  last_message: string | null;
  last_message_at: string | null;
  status: string;
};

const AVATARS = ["#ef4444", "#f97316", "#3b82f6", "#10b981", "#8b5cf6"];

export default function ChatListPage() {
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [status, setStatus] = useState("berlangsung");
  const [q, setQ] = useState("");

  async function load(nextStatus = status, query = q) {
    const params = new URLSearchParams({ status: nextStatus });
    if (query) params.set("q", query);
    const res = await apiFetch(apiUrl(`/api/conversations?${params.toString()}`));
    if (!res.ok) return;
    const data = await res.json().catch(() => ({ items: [] }));
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col px-5 pb-5 pt-6">
        <CustomerHeader
          title="Chat"
          extra={
            <CircleIconButton href="/transaksi">
              <ArrowLeft size={18} />
            </CircleIconButton>
          }
        />

        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatus("berlangsung");
              load("berlangsung");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              status === "berlangsung" ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            Berlangsung
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("selesai");
              load("selesai");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              status === "selesai" ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            Selesai
          </button>
        </div>

        <form
          className="relative mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            load(status, q);
          }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari tiket atau transaksi..."
            className="w-full rounded-full bg-zinc-100 py-2 pl-9 pr-3 text-sm outline-none"
          />
        </form>

        <div className="flex-1">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(`/chat/${item.id}`)}
              className="flex w-full items-start gap-3 border-b border-zinc-100 py-3 text-left"
            >
              <span
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: AVATARS[index % AVATARS.length] }}
              >
                {(item.product_code || "T").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {item.reseller_phone || "Reseller"}{" "}
                  <span className="font-medium text-zinc-500">{item.product_code || ""}</span>
                </p>
                <p className="truncate text-sm text-zinc-400">{truncate(item.last_message || "", 36)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400">{formatTime(item.last_message_at)}</p>
                <p className="text-xs font-medium text-sky-600">#{item.transaction_id}</p>
              </div>
            </button>
          ))}
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-400">Belum ada percakapan.</p>
          ) : null}
        </div>
      </div>
    </PhoneShell>
  );
}
