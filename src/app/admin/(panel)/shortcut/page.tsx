"use client";

import { FormEvent, useEffect, useState } from "react";

type Shortcut = { id: number; label: string; active: boolean; sort_order: number };

export default function AdminShortcutPage() {
  const [items, setItems] = useState<Shortcut[]>([]);
  const [label, setLabel] = useState("");

  async function load() {
    const res = await fetch("/api/admin/shortcuts");
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    await fetch("/api/admin/shortcuts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setLabel("");
    await load();
  }

  async function toggle(item: Shortcut) {
    await fetch("/api/admin/shortcuts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Shortcut Pesan</h1>
      <p className="mt-1 text-slate-500">Teks cepat yang muncul di aplikasi pelanggan saat membuat komplain.</p>

      <form onSubmit={add} className="mt-6 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Contoh: serial number kosong, mohon dibantu"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
        />
        <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white">
          Tambah
        </button>
      </form>

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className={item.active ? "font-medium" : "text-slate-400 line-through"}>{item.label}</p>
            <button type="button" onClick={() => toggle(item)} className="text-sm font-semibold text-sky-700">
              {item.active ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
