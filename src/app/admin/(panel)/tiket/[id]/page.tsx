"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Paperclip, Send } from "lucide-react";
import { formatDateTime, formatNominal, formatTime, labelStatusTiket } from "@/lib/format";
import { canDeleteRecords } from "@/lib/roles";
import { apiUrl } from "@/lib/paths";

type Ticket = {
  id: string;
  ticket_no: string | null;
  transaction_id: string;
  reseller_kode: string;
  reseller_phone: string | null;
  product_code: string | null;
  status: string;
  priority: string;
  assigned_name: string | null;
};

type Message = {
  id: string;
  sender_role: "agent" | "cs" | "system";
  sender_name: string | null;
  body: string;
  attachment_path: string | null;
  created_at: string;
};

type Trx = {
  id: string;
  tanggalEntri: string | null;
  tanggalStatus: string | null;
  tujuan: string;
  nominal: number | null;
  keterangan: string;
  serialNumber: string;
  kodeProduk: string;
  namaProduk?: string;
};

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [trx, setTrx] = useState<Trx | null>(null);
  const [text, setText] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [res, me] = await Promise.all([
      fetch(apiUrl(`/api/admin/tickets/${params.id}`)),
      fetch(apiUrl("/api/admin/auth/me")).then((r) => r.json()),
    ]);
    const data = await res.json();
    setTicket(data.ticket);
    setMessages(data.messages || []);
    setTrx(data.transaction);
    setCanDelete(canDeleteRecords(me.user?.role));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(event?: FormEvent, file?: File | null) {
    event?.preventDefault();
    if (!text.trim() && !file) return;
    const form = new FormData();
    form.set("body", text);
    if (file) form.set("file", file);
    setText("");
    await fetch(apiUrl(`/api/admin/tickets/${params.id}/messages`), { method: "POST", body: form });
    await load();
  }

  async function updateTicket(payload: Record<string, unknown>) {
    await fetch(apiUrl(`/api/admin/tickets/${params.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await load();
  }

  async function removeTicket() {
    if (!confirm("Hapus tiket ini beserta seluruh percakapannya?")) return;
    const res = await fetch(apiUrl(`/api/admin/tickets/${params.id}`), { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus tiket");
      return;
    }
    router.replace("/admin/tiket");
  }

  return (
    <div>
      <Link href="/admin/tiket" className="text-sm font-medium text-sky-700">
        ← Kembali ke daftar tiket
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{ticket?.ticket_no || "Tiket"}</h1>
          <p className="text-slate-500">
            Reseller {ticket?.reseller_kode} · {ticket?.reseller_phone || "-"} · #{ticket?.transaction_id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateTicket({ assignToMe: true, status: "proses" })}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Ambil & proses
          </button>
          <button
            type="button"
            onClick={() => updateTicket({ status: "selesai" })}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tutup tiket
          </button>
          <button
            type="button"
            onClick={() => updateTicket({ status: "berlangsung" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Buka kembali
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={removeTicket}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Hapus tiket
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="flex min-h-[520px] flex-col rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Percakapan</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
              {ticket ? labelStatusTiket(ticket.status) : "-"}
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.map((message) => {
              if (message.sender_role === "system") {
                return (
                  <p key={message.id} className="text-center text-xs text-slate-400">
                    {message.body}
                  </p>
                );
              }
              const own = message.sender_role === "cs";
              return (
                <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      own ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="text-[10px] opacity-70">{own ? "CS" : "Pelanggan"} · {message.sender_name}</p>
                    {message.body ? <p className="mt-1">{message.body}</p> : null}
                    {message.attachment_path ? (
                      <a href={apiUrl(message.attachment_path)} target="_blank" className="mt-1 block text-xs underline">
                        Lampiran
                      </a>
                    ) : null}
                    <p className="mt-1 text-[10px] opacity-70">{formatTime(message.created_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <Paperclip size={16} />
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => send(undefined, e.target.files?.[0])} />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tulis balasan untuk pelanggan..."
              className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none"
            />
            <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white">
              <Send size={14} />
            </button>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">Data transaksi (hanya baca)</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="ID Transaksi" value={trx?.id || ticket?.transaction_id || "-"} />
              <Row label="Tanggal entri" value={formatDateTime(trx?.tanggalEntri)} />
              <Row label="Tanggal status" value={formatDateTime(trx?.tanggalStatus)} />
              <Row label="Nomor tujuan" value={trx?.tujuan || "-"} />
              <Row label="Nominal" value={formatNominal(trx?.nominal)} />
              <Row label="Kode produk" value={trx?.kodeProduk || ticket?.product_code || "-"} />
              <Row label="Nama produk" value={trx?.namaProduk || "-"} />
              <Row label="Serial number" value={trx?.serialNumber || "-"} />
              <Row label="Keterangan" value={trx?.keterangan || "-"} />
            </dl>
          </section>
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">Penugasan</h2>
            <p className="mt-2 text-sm text-slate-600">Petugas: {ticket?.assigned_name || "Belum diambil"}</p>
            <p className="mt-1 text-sm text-slate-600">Prioritas: {ticket?.priority || "normal"}</p>
            <div className="mt-3 flex gap-2">
              {(["rendah", "normal", "tinggi"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateTicket({ priority: item })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    ticket?.priority === item ? "bg-slate-950 text-white" : "bg-slate-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="break-all font-medium">{value}</dd>
    </div>
  );
}
