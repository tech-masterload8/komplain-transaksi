"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, labelStatusTiket } from "@/lib/format";
import { canManageUsers } from "@/lib/roles";
import { apiUrl } from "@/lib/paths";

type Stats = { total: number; baru: number; proses: number; selesai: number };
type Ticket = {
  id: string;
  ticket_no: string | null;
  transaction_id: string;
  reseller_kode: string;
  reseller_phone: string | null;
  status: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};
type SchemaInfo = {
  ok: boolean;
  error?: string;
  transaksi?: { table: string; mapping: Record<string, string | null> };
  reseller?: { table: string; mapping: Record<string, string | null> };
  produk?: { table: string | null; mapping: Record<string, string | null> };
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, baru: 0, proses: 0, selesai: 0 });
  const [latest, setLatest] = useState<Ticket[]>([]);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/admin/tickets/stats"))
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats || stats);
        setLatest(data.latest || []);
      });
    fetch(apiUrl("/api/admin/auth/me"))
      .then((res) => res.json())
      .then((data) => {
        if (!canManageUsers(data.user?.role)) return;
        setShowSchema(true);
        return fetch(apiUrl("/api/admin/otomax-schema")).then((res) => res.json());
      })
      .then((info) => {
        if (info) setSchema(info);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = [
    { label: "Semua tiket", value: stats.total, href: "/admin/tiket" },
    { label: "Baru", value: stats.baru, href: "/admin/tiket?status=berlangsung" },
    { label: "Diproses", value: stats.proses, href: "/admin/tiket?status=proses" },
    { label: "Selesai", value: stats.selesai, href: "/admin/tiket?status=selesai" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Dasbor</h1>
      <p className="mt-1 text-slate-500">Ringkasan tiket komplain yang perlu ditindaklanjuti.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-extrabold">{card.value}</p>
          </Link>
        ))}
      </div>

      {showSchema ? (
        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Sumber data OtoMax (hanya baca)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Transaksi pelanggan difilter dengan kode agen dari header Android, lalu dicocokkan ke kolom{" "}
            <code>kode_reseller</code>.
          </p>
          {schema?.ok ? (
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">Tabel transaksi</dt>
                <dd className="font-medium">{schema.transaksi?.table}</dd>
                <dd className="mt-1 text-slate-600">
                  ID: {schema.transaksi?.mapping.id || "-"} · Reseller:{" "}
                  {schema.transaksi?.mapping.kodeReseller || "-"} · Produk:{" "}
                  {schema.transaksi?.mapping.kodeProduk || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Tabel reseller</dt>
                <dd className="font-medium">{schema.reseller?.table}</dd>
                <dd className="mt-1 text-slate-600">
                  Kode: {schema.reseller?.mapping.kode || "-"} · Nama: {schema.reseller?.mapping.nama || "-"} · HP:{" "}
                  {schema.reseller?.mapping.phone || "-"}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs text-slate-400">Tabel produk</dt>
                <dd className="font-medium">{schema.produk?.table || "-"}</dd>
                <dd className="mt-1 text-slate-600">
                  Kode: {schema.produk?.mapping.kode || "-"} · Nama: {schema.produk?.mapping.nama || "-"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-red-500">{schema?.error || "Belum bisa membaca otomaxbank."}</p>
          )}
        </div>
      ) : null}

      <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Tiket terbaru</h2>
          <Link href="/admin/tiket" className="text-sm font-medium text-sky-600">
            Lihat semua
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Nomor</th>
                <th className="pb-3">Reseller</th>
                <th className="pb-3">Transaksi</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-3">
                    <Link href={`/admin/tiket/${item.id}`} className="font-semibold text-sky-700">
                      {item.ticket_no || item.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-3">
                    {item.reseller_kode}
                    <div className="text-xs text-slate-400">{item.reseller_phone}</div>
                  </td>
                  <td className="py-3">#{item.transaction_id}</td>
                  <td className="py-3">{labelStatusTiket(item.status)}</td>
                  <td className="py-3 text-slate-500">{formatDateTime(item.last_message_at || item.created_at)}</td>
                </tr>
              ))}
              {latest.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada tiket.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
