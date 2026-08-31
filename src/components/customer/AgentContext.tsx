"use client";

import { createContext, useContext, useEffect } from "react";
import type { AgentProfile } from "@/lib/agent-profile";
import { rememberSessionToken } from "@/lib/client-session";

const AgentContext = createContext<AgentProfile | null>(null);

/**
 * Identitas reseller dibaca sekali dari sesi di layout server, lalu dipakai
 * semua halaman. Header Android hanya ada di request pertama, jadi token sesi
 * ikut disimpan untuk navigasi berikutnya.
 */
export function AgentProvider({
  user,
  token,
  children,
}: {
  user: AgentProfile | null;
  token?: string | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    rememberSessionToken(token);
  }, [token]);

  return <AgentContext.Provider value={user}>{children}</AgentContext.Provider>;
}

export function useAgentContext() {
  return useContext(AgentContext);
}
