import crypto from "node:crypto";

export type AgentHeaderPayload = {
  token?: string;
  date?: string;
  kode?: string;
  kodeagen?: string;
  id_agen?: string;
  agen?: string;
  reseller?: string;
  nohp?: string;
  hp?: string;
  nama?: string;
  name?: string;
  [key: string]: unknown;
};

/**
 * Port of the PHP Key Web Developer decrypt() helper.
 * Authorization: ENC Key="...", Signature="..."
 */
export function decryptAgentHeader(
  signatureB64: string,
  privateKeyMix: string,
  encKey: string,
): AgentHeaderPayload | null {
  try {
    const pesan = Buffer.from(signatureB64, "base64");
    const decode64 = Buffer.from(encKey, "base64");
    const sha512hex = crypto.createHash("sha512").update(decode64).digest("hex");
    const decode64sha512 = Buffer.from(sha512hex, "base64");
    const mix = Buffer.from(privateKeyMix, "base64");

    const ivLength = 16;
    if (mix.length <= ivLength + 64) return null;

    const iv = mix.subarray(0, ivLength);
    const hashhmac = mix.subarray(ivLength, ivLength + 64);
    const opensslenc = mix.subarray(ivLength + 64);

    const aesKey =
      decode64.length >= 32
        ? decode64.subarray(0, 32)
        : Buffer.concat([decode64, Buffer.alloc(32 - decode64.length)]);

    const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
    const rsaKeyBuf = Buffer.concat([decipher.update(opensslenc), decipher.final()]);

    const hmac = crypto.createHmac("sha3-512", decode64sha512).update(opensslenc).digest();
    if (hmac.length !== hashhmac.length || !crypto.timingSafeEqual(hashhmac, hmac)) {
      return null;
    }

    const rsaKey = toPrivateKey(rsaKeyBuf);
    const decrypted = crypto.privateDecrypt(
      {
        key: rsaKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha1",
      },
      pesan,
    );

    return JSON.parse(decrypted.toString("utf8")) as AgentHeaderPayload;
  } catch {
    return null;
  }
}

export function parseAuthorizationHeader(header: string | undefined | null) {
  if (!header) return null;
  const match = header.match(/ENC Key="(.*)", Signature="(.*)"/);
  if (!match?.[1] || !match?.[2]) return null;
  return { key: match[1], signature: match[2] };
}

function toPrivateKey(raw: Buffer) {
  const asText = raw.toString("utf8").trim();
  if (asText.includes("BEGIN")) {
    return crypto.createPrivateKey(asText);
  }
  for (const type of ["pkcs8", "pkcs1"] as const) {
    try {
      return crypto.createPrivateKey({ key: raw, format: "der", type });
    } catch {
      /* try next */
    }
  }
  return crypto.createPrivateKey(asText);
}

export function agentCodeFromPayload(payload: AgentHeaderPayload) {
  const value =
    payload.kode ||
    payload.kodeagen ||
    payload.id_agen ||
    payload.agen ||
    payload.reseller ||
    "";
  return String(value).trim();
}

export function phoneFromPayload(payload: AgentHeaderPayload) {
  return String(payload.nohp || payload.hp || "").trim();
}

export function nameFromPayload(payload: AgentHeaderPayload) {
  return String(payload.nama || payload.name || "").trim();
}
