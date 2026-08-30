"use client";

import { useAgent } from "./useAgent";
import type { AgentProfile } from "@/lib/agent-profile";

export function CustomerHeader({
  title,
  extra,
  user: userProp,
}: {
  title: string;
  extra?: React.ReactNode;
  user?: AgentProfile | null;
}) {
  const { user } = useAgent(userProp);

  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {user?.kode || "Reseller"}
          </p>
          <p className="mt-1 truncate text-lg font-bold leading-tight text-zinc-900">
            {user?.name || "Memuat akun..."}
          </p>
          <h1 className="mt-4 text-[28px] font-extrabold tracking-tight">{title}</h1>
        </div>
        {extra ? <div className="flex shrink-0 gap-2 pt-1">{extra}</div> : null}
      </div>
    </header>
  );
}
