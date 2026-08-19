"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, labelStatusTiket } from "@/lib/format";
import { apiUrl } from "@/lib/paths";

type Ticket = {
  id: string;
  ticket_no: string | null;
  transaction_id: string;
  reseller_kode: string;
  reseller_phone: string | null;
  product_code: string | null;
  status: string;
  last_message: string | null;
  last_message_at: string | null;
  assigned_name: string | null;
  created_at: string;
};

const FILTERS = [
  { value: "", label: "Semua" },
  { value: "berlangsung", label: "Baru" },
  { value: "proses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
];

export default function AdminTicketListPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Ticket[]>([]);

  async function load(nextStatus = status, query = q) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (query) params.set("q", query);
    const res = await fetch(apiUrl(`/api/admin/tickets?${params.toString()}`));
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("status") || "";
    setStatus(initial);
    load(initial, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Tiket Komplain</h1>
      <p className="mt-1 text-slate-500">Tindak lanjuti laporan pelanggan dan ubah status tiket.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setStatus(item.value);
              load(item.value, q);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              status === item.value ? "bg-slate-950 text-white" : "bg-white text-slate-600"
            }`}
          >
            {item.label}
          </button>
        ))}
        <form
          className="ml-auto"
          onSubmit={(e) => {
            e.preventDefault();
            load(status, q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nomor tiket, reseller, atau transaksi"
            className="w-72 max-w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
          />
        </form>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Tiket</th>
              <th className="px-4 py-3">Reseller</th>
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3">Pesan terakhir</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Petugas</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/tiket/${item.id}`} className="font-semibold text-sky-700">
                    {item.ticket_no || "Tanpa nomor"}
                  </Link>
                  <div className="text-xs text-slate-400">#{item.transaction_id}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(item.last_message_at || item.created_at)}</div>
                </td>
                <td className="px-4 py-3">
                  {item.reseller_kode}
                  <div className="text-xs text-slate-400">{item.reseller_phone}</div>
                </td>
                <td className="px-4 py-3">{item.product_code || "-"}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">{item.last_message || "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.status === "selesai"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.status === "proses"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-sky-50 text-sky-700"
                    }`}
                  >
                    {labelStatusTiket(item.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{item.assigned_name || "-"}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Tidak ada tiket pada filter ini.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
