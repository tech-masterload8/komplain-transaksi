"use client";

import { useEffect, useState } from "react";

export type AgentProfile = {
  kode: string;
  name: string;
  phone?: string;
};

export function useAgent() {
  const [user, setUser] = useState<AgentProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
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
  }, []);

  return { user, ready };
}
