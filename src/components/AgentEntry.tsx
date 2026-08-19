"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "@/components/PhoneShell";
import LoginForm from "@/components/LoginForm";
import { useAgent } from "@/components/customer/useAgent";

export default function AgentEntry() {
  const router = useRouter();
  const { user, ready } = useAgent();
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/transaksi");
  }, [ready, user, router]);

  useEffect(() => {
    setManual(new URLSearchParams(window.location.search).has("uji"));
  }, []);

  if (manual) return <LoginForm />;

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Komplain Transaksi
        </p>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight">
          {ready && !user ? "Akun belum terbaca" : "Menyiapkan akun reseller"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {ready && !user
            ? "Buka menu ini dari aplikasi Android agar kode reseller dikirim otomatis. Login nomor HP dan PIN tidak diperlukan."
            : "Kode reseller dari aplikasi sedang dicocokkan. Daftar transaksi akan muncul setelah akun dikenali."}
        </p>
      </div>
    </PhoneShell>
  );
}
