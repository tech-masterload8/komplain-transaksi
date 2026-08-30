export type AgentProfile = {
  kode: string;
  name: string;
  phone?: string;
};

export function toAgentProfile(user: { kode: string; name?: string; phone?: string } | null) {
  if (!user?.kode) return null;
  return { kode: user.kode, name: user.name || user.kode, phone: user.phone } satisfies AgentProfile;
}
