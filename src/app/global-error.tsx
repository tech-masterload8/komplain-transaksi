"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="bg-white px-5 pt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Komplain Transaksi</p>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight">Aplikasi gagal dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{error.message || "Terjadi kesalahan."}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
        >
          Coba lagi
        </button>
      </body>
    </html>
  );
}
