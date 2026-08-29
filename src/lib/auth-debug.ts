export type AuthDebugInfo = {
  reason: string;
  headerLength: number;
  decryptedText: string | null;
  payloadJson: string | null;
  payloadKeys: string[];
};

const REDACT_KEYS = /^(pin|password|passwd|pwd|secret|otp)$/i;

export function encodeAuthDebugHeader(info: AuthDebugInfo) {
  const copy = { ...info };
  if ((copy.decryptedText || "").length > 4000) {
    copy.decryptedText = `${(copy.decryptedText || "").slice(0, 4000)}\n...[dipotong]...`;
  }
  return Buffer.from(JSON.stringify(copy), "utf8").toString("base64url");
}

export function decodeAuthDebugHeader(value: string | null | undefined): AuthDebugInfo | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as AuthDebugInfo;
  } catch {
    return null;
  }
}

export function formatAuthDebugDump(info: AuthDebugInfo) {
  const lines = [
    `kode: ${info.reason}`,
    `panjang header: ${info.headerLength}`,
    "",
    "=== JSON payload ===",
    info.payloadJson || "(bukan JSON / gagal parse)",
    "",
    "=== teks setelah dekripsi ===",
    info.decryptedText || "(gagal dekripsi / bukan teks)",
    "",
    "=== nama field ===",
    info.payloadKeys.length ? info.payloadKeys.join(", ") : "(tidak ada)",
    "",
  ];
  return lines.join("\n");
}

export function redactPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPayload);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT_KEYS.test(key) ? "[disembunyikan]" : redactPayload(nested);
  }
  return out;
}
