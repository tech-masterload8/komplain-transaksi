"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, CreditCard, Hash, MessageCircle, Phone, Search, Send } from "lucide-react";
import PhoneShell from "@/components/PhoneShell";
import { CircleIconButton } from "@/components/CircleIconButton";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { formatDateTime, formatNominal } from "@/lib/format";
import { apiFetch } from "@/lib/client-session";
import { apiUrl } from "@/lib/paths";

type Trx = {
  id: string;
  tanggalEntri: string | null;
  tanggalStatus: string | null;
  tujuan: string;
  nominal: number | null;
  keterangan: string;
  serialNumber: string;
  kodeProduk?: string;
  namaProduk?: string;
  pengirim?: string;
};

export default function TransaksiDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Trx | null>(null);
  const [shortcuts, setShortcuts] = useState<{ id: number; label: string }[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(apiUrl(`/api/transaksi/${params.id}`))
      .then(async (res) => {
        const data = await res.json().catch(() => ({}) as { item?: Trx; error?: string });
        if (!res.ok) {
          setError(
            res.status === 401
              ? "Sesi tidak terbaca. Tutup menu Website, lalu buka lagi dari APK."
              : data.error || "Transaksi tidak bisa dibuka.",
          );
          return;
        }
        setItem(data.item);
      })
      .catch(() => setError("Tidak bisa memuat detail transaksi."));
    apiFetch(apiUrl("/api/shortcuts"))
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setShortcuts(data.items || []))
      .catch(() => setShortcuts([]));
  }, [params.id]);

  async function send() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiFetch(apiUrl("/api/conversations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: params.id, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal mengirim");
        return;
      }
      router.push(`/chat/${data.conversationId}`);
    } finally {
      setSending(false);
    }
  }

  const rows = item
    ? [
        { icon: <Hash size={16} />, label: "Transaksi ID", value: item.id },
        { icon: <Calendar size={16} />, label: "Tanggal Entri", value: formatDateTime(item.tanggalEntri) },
        { icon: <Calendar size={16} />, label: "Tanggal Status", value: formatDateTime(item.tanggalStatus) },
        { icon: <Phone size={16} />, label: "Nomor Tujuan", value: item.tujuan || "-" },
        { icon: <CreditCard size={16} />, label: "Nominal", value: formatNominal(item.nominal) },
        { icon: <Hash size={16} />, label: "Produk", value: item.namaProduk || item.kodeProduk || "-" },
        { icon: <Hash size={16} />, label: "Keterangan", value: item.keterangan || "-" },
        { icon: <Hash size={16} />, label: "Serial Number", value: item.serialNumber || "-" },
      ]
    : [];

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col px-5 pb-4 pt-6">
        <CustomerHeader
          title="Detail"
          extra={
            <>
              <CircleIconButton href="/transaksi">
                <Search size={18} />
              </CircleIconButton>
              <CircleIconButton href="/chat">
                <MessageCircle size={18} />
              </CircleIconButton>
            </>
          }
        />

        {error ? (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</p>
        ) : null}

        <div className="rounded-[24px] border border-zinc-100 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          {!item && !error ? (
            <p className="py-6 text-center text-sm text-zinc-400">Memuat detail transaksi...</p>
          ) : null}
          {rows.map((row) => (
            <div key={row.label} className="flex gap-3 border-b border-zinc-100 py-2.5 last:border-b-0">
              <span className="mt-0.5 text-zinc-400">{row.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">{row.label}</p>
                <p className="break-all text-sm font-semibold">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[24px] border border-zinc-100 p-4">
          <p className="text-xs text-zinc-400">Transaksi ID</p>
          <p className="font-bold">{item?.id || params.id}</p>
          <p className="mt-3 text-sm text-zinc-500">pilih shortcut pesan atau ketik manual</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {shortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMessage(item.label)}
                className="rounded-full bg-zinc-100 px-3 py-1.5 text-left text-xs text-zinc-600"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="isi manual / klik shortcut (akan mengisi ini)"
            className="flex-1 rounded-full bg-zinc-700 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
