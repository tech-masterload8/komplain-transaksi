"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "@/components/PhoneShell";
import LoginForm from "@/components/LoginForm";
import { useAgent } from "@/components/customer/useAgent";
import type { AuthIngestReason } from "@/lib/auth-reason";

const REASON_COPY: Record<AuthIngestReason, { title: string; body: string }> = {
  ok: {
    title: "Menyiapkan akun reseller",
    body: "Kode reseller dari aplikasi sedang dicocokkan. Daftar transaksi akan muncul setelah akun dikenali.",
  },
  "has-session": {
    title: "Menyiapkan akun reseller",
    body: "Kode reseller dari aplikasi sedang dicocokkan. Daftar transaksi akan muncul setelah akun dikenali.",
  },
  "no-header": {
    title: "Akun belum terbaca",
    body: "Header kode reseller tidak sampai ke server. Tutup menu Website, lalu buka lagi dari aplikasi Android (Mode Khusus). Jangan refresh halaman.",
  },
  unparsed: {
    title: "Header tidak dikenali",
    body: "Header Authorization sampai ke server, tetapi formatnya bukan ENC Key/Signature. Nginx atau WAF mungkin memotong header. Tutup menu, buka lagi dari APK Mode Khusus.",
  },
  "no-key": {
    title: "Kunci web belum terpasang",
    body: "WEB_DEV_PRIVATE_KEY belum terbaca di server. Periksa environment Docker, lalu recreate container.",
  },
  decrypt: {
    title: "Dekripsi header gagal",
    body: "Private key di server tidak cocok dengan kunci project di Web Report, atau APK belum dikompilasi ulang setelah key diaktifkan.",
  },
  "no-kode": {
    title: "Kode agen tidak ada",
    body: "Header berhasil dibuka, tetapi tidak berisi kode reseller. Salin dump di bawah lalu kirim agar field payload bisa dipetakan.",
  },
  "token-expired": {
    title: "Token sudah kedaluwarsa",
    body: "Header Android hanya berlaku beberapa menit. Tutup menu Website, lalu buka lagi dari aplikasi (jangan refresh).",
  },
};

export default function AgentEntry({
  authReason,
  debugDump,
  cookieSent = false,
}: {
  authReason?: AuthIngestReason;
  debugDump?: string;
  cookieSent?: boolean;
}) {
  const router = useRouter();
  const { user, ready } = useAgent();
  const [manual, setManual] = useState(false);
  const [copied, setCopied] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ready && user) router.replace("/transaksi");
  }, [ready, user, router]);

  useEffect(() => {
    setManual(new URLSearchParams(window.location.search).has("uji"));
  }, []);

  if (manual) return <LoginForm />;

  // Server sudah tahu apakah cookie sesi ikut terkirim, jadi jangan menahan
  // layar di teks "menyiapkan" sambil menunggu /api/auth/me.
  const failed = ready ? !user : !cookieSent;
  const copy = failed
    ? REASON_COPY[authReason || "no-header"]
    : REASON_COPY.ok;

  async function copyDump() {
    const text = debugDump || "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const el = areaRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }

  return (
    <PhoneShell>
      <div className="flex min-h-dvh flex-col justify-start overflow-y-auto px-6 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Komplain Transaksi
        </p>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{copy.body}</p>
        {failed ? (
          <p className="mt-4 text-[11px] font-mono text-zinc-400">
            kode: {authReason || "no-header"} · cookie sesi: {cookieSent ? "terkirim" : "tidak terkirim"}
          </p>
        ) : null}
        {failed && debugDump ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-zinc-500">Dump header (bisa disalin)</p>
              <button
                type="button"
                onClick={copyDump}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
            <textarea
              ref={areaRef}
              readOnly
              value={debugDump}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-2 h-64 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] leading-5 text-zinc-700"
            />
          </div>
        ) : null}
      </div>
    </PhoneShell>
  );
}
