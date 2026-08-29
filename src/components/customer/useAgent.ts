"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/paths";

export type AgentProfile = {
  kode: string;
  name: string;
  phone?: string;
};

export function useAgent(initial?: AgentProfile | null) {
  const [user, setUser] = useState<AgentProfile | null>(initial ?? null);
  const [ready, setReady] = useState(Boolean(initial?.kode));

  useEffect(() => {
    if (initial?.kode) {
      setUser(initial);
      setReady(true);
      return;
    }
    let cancelled = false;
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        const next = data.user;
        setUser(
          next?.kode
            ? { kode: String(next.kode), name: String(next.name || next.kode), phone: next.phone }
            : null,
        );
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initial?.kode]);

  return { user, ready };
}
