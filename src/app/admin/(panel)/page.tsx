"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, labelStatusTiket } from "@/lib/format";

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, baru: 0, proses: 0, selesai: 0 });
  const [latest, setLatest] = useState<Ticket[]>([]);

  useEffect(() => {
    fetch("/api/admin/tickets/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats || stats);
        setLatest(data.latest || []);
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
