"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

type Staff = { id: string; phone: string; name: string; role: string; created_at: string };

export default function AdminStaffPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("cs");
  const [error, setError] = useState("");

  async function load() {
    const [staff, auth] = await Promise.all([
      fetch("/api/admin/staff").then((res) => res.json()),
      fetch("/api/admin/auth/me").then((res) => res.json()),
    ]);
    setItems(staff.items || []);
    setMe(auth.user || null);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, pin, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      return;
    }
    setName("");
    setPhone("");
    setPin("");
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Staf CS</h1>
      <p className="mt-1 text-slate-500">Akun yang dapat masuk ke panel admin dan menyelesaikan tiket.</p>

      {me?.role === "admin" ? (
        <form onSubmit={add} className="mt-6 grid gap-3 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nomor handphone"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 px-3 outline-none"
            >
              <option value="cs">CS</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="rounded-2xl bg-slate-950 px-4 font-semibold text-white">
              Simpan
            </button>
          </div>
          {error ? <p className="md:col-span-4 text-sm text-red-500">{error}</p> : null}
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Hanya admin yang dapat menambah staf baru.</p>
      )}

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Nomor</th>
              <th className="px-4 py-3">Peran</th>
              <th className="px-4 py-3">Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{item.phone}</td>
                <td className="px-4 py-3 uppercase">{item.role}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
