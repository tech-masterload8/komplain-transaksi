"use client";

import { createContext, useContext } from "react";
import type { AgentProfile } from "@/lib/agent-profile";

const AgentContext = createContext<AgentProfile | null>(null);

/**
 * Identitas reseller dibaca sekali dari cookie sesi di layout server, lalu
 * dipakai semua halaman. Header Android hanya ada di request pertama, jadi
 * halaman berikutnya tidak boleh bergantung padanya.
 */
export function AgentProvider({
  user,
  children,
}: {
  user: AgentProfile | null;
  children: React.ReactNode;
}) {
  return <AgentContext.Provider value={user}>{children}</AgentContext.Provider>;
}

export function useAgentContext() {
  return useContext(AgentContext);
}
