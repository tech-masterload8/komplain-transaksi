"use client";

import { useEffect, useState } from "react";
import { useAgentContext } from "./AgentContext";
import { apiUrl } from "@/lib/paths";
import type { AgentProfile } from "@/lib/agent-profile";

export type { AgentProfile } from "@/lib/agent-profile";

export function useAgent(initial?: AgentProfile | null) {
  const fromContext = useAgentContext();
  const known = initial?.kode ? initial : fromContext;
  const [user, setUser] = useState<AgentProfile | null>(known ?? null);
  const [ready, setReady] = useState(Boolean(known?.kode));

  useEffect(() => {
    if (known?.kode) {
      setUser(known);
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
  }, [known?.kode, known?.name, known?.phone]);

  return { user, ready };
}
