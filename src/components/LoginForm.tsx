"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import PhoneShell from "@/components/PhoneShell";
import { apiUrl } from "@/lib/paths";

export default function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        return;
      }
      router.replace("/transaksi");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col justify-end px-5 pb-8 pt-10">
        <form onSubmit={onSubmit} className="rounded-[28px] bg-white">
          <h1 className="text-[28px] font-extrabold tracking-tight">Masuk ke akunmu</h1>
          <p className="mt-2 text-sm text-zinc-400">Pastikan kredensial yang kamu masukkan benar ya!</p>

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="Nomor handphone"
            className="mt-8 w-full rounded-full border border-zinc-200 bg-white px-5 py-3.5 text-sm outline-none placeholder:text-zinc-400 focus:border-black"
          />

          <div className="relative mt-3">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type={showPin ? "text" : "password"}
              placeholder="Pin"
              className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3.5 pr-12 text-sm outline-none placeholder:text-zinc-400 focus:border-black"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
              aria-label="Tampilkan PIN"
            >
              {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-black py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}
