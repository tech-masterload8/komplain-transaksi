import crypto from "node:crypto";

export type AgentHeaderPayload = {
  token?: string;
  date?: string;
  kode?: string;
  kode_reseller?: string;
  kodereseller?: string;
  kodeagen?: string;
  kode_agen?: string;
  id_agen?: string;
  agen?: string;
  reseller?: string;
  nohp?: string;
  hp?: string;
  nomor_hp?: string;
  nama?: string;
  name?: string;
  [key: string]: unknown;
};

/**
 * Port of the PHP Key Web Developer decrypt() helper from
 * tutorial-key-web-developer-15:
 *   openssl_decrypt(..., "aes-256-cbc", $decode64, OPENSSL_RAW_DATA, $iv)
 *   hash_hmac("sha3-512", ...)
 *   openssl_private_decrypt(..., OPENSSL_PKCS1_OAEP_PADDING)
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
    const hmacKey = Buffer.from(sha512hex, "base64");
    const mix = Buffer.from(privateKeyMix.replace(/\s+/g, ""), "base64");

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

    const hmac = crypto.createHmac("sha3-512", hmacKey).update(opensslenc).digest();
    if (hmac.length !== hashhmac.length || !crypto.timingSafeEqual(hashhmac, hmac)) {
      return null;
    }

    const rsaKey = toPrivateKey(rsaKeyBuf);
    let decrypted: Buffer | null = null;
    for (const oaepHash of ["sha1", "sha256"] as const) {
      try {
        decrypted = crypto.privateDecrypt(
          {
            key: rsaKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash,
          },
          pesan,
        );
        break;
      } catch {
        /* try next digest */
      }
    }
    if (!decrypted) {
      decrypted = crypto.privateDecrypt(
        { key: rsaKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        pesan,
      );
    }

    return JSON.parse(decrypted.toString("utf8")) as AgentHeaderPayload;
  } catch {
    return null;
  }
}

export function parseAuthorizationHeader(header: string | undefined | null) {
  if (!header) return null;
  const match = header.match(/ENC\s+Key="([^"]+)"\s*,\s*Signature="([^"]+)"/i);
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
    payload.kode_reseller ||
    payload.kodereseller ||
    payload.kode_agen ||
    payload.kodeagen ||
    payload.kode ||
    payload.id_agen ||
    payload.agen ||
    payload.reseller ||
    "";
  return String(value).trim();
}

export function phoneFromPayload(payload: AgentHeaderPayload) {
  return String(payload.nomor_hp || payload.nohp || payload.hp || "").trim();
}

export function nameFromPayload(payload: AgentHeaderPayload) {
  return String(payload.nama || payload.name || "").trim();
}
