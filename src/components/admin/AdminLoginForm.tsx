"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Panel Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold">Masuk sebagai CS</h1>
        <p className="mt-2 text-sm text-slate-500">
          Gunakan akun staf untuk menyelesaikan tiket komplain pelanggan.
        </p>
        <label className="mt-8 block text-sm font-medium">Nomor handphone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
        />
        <label className="mt-4 block text-sm font-medium">PIN</label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          type="password"
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
        />
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-slate-950 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
