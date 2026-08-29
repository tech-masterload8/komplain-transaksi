import { appdb } from "./db";
import {
  agentCodeFromPayload,
  decryptAgentHeaderDetailed,
  describeAuthorization,
  joinHeaderValue,
  nameFromPayload,
  normalizeWebDevPrivateKey,
  parseAuthorizationHeader,
  phoneFromPayload,
  tokenFromPayload,
  dateFromPayload,
} from "./decrypt";
import { findReseller } from "./otomax";
import { CUSTOMER_COOKIE, readSessionCookie, sessionCookie, signSession, verifySession, type SessionUser } from "./session";
import type { AuthIngestReason } from "./auth-reason";
import { redactPayload, type AuthDebugInfo } from "./auth-debug";

export type { AuthIngestReason } from "./auth-reason";

const TOKEN_TTL_MS = 5 * 60 * 1000;

export async function getUserFromRequest(req: { headers: { cookie?: string; authorization?: string } }) {
  const existing = await verifySession(readSessionCookie(req.headers.cookie));
  if (existing) return existing;
  return null;
}

export async function ingestAuthorization(req: {
  headers: {
    cookie?: string;
    authorization?: string | string[];
    "x-authorization"?: string | string[];
    signature?: string | string[];
    "x-forwarded-proto"?: string;
  };
}): Promise<{ user: SessionUser | null; setCookie?: string; reason: AuthIngestReason; debug?: AuthDebugInfo }> {
  const existing = await verifySession(readSessionCookie(req.headers.cookie));
  if (existing) {
    return { user: existing, reason: "has-session" };
  }

  const authorization =
    joinHeaderValue(req.headers.authorization) || joinHeaderValue(req.headers["x-authorization"]);
  const signaturePart = joinHeaderValue(req.headers.signature);
  const combined =
    authorization && signaturePart && !/Signature=/i.test(authorization)
      ? `${authorization}, Signature="${signaturePart.replace(/^["']|["']$/g, "")}"`
      : authorization;

  const debugBase = {
    headerLength: combined?.length || 0,
    decryptedText: null as string | null,
    payloadJson: null as string | null,
    payloadKeys: [] as string[],
  };
  const finish = (reason: AuthIngestReason, extra?: Partial<AuthDebugInfo>) =>
    ({
      ...debugBase,
      reason,
      ...extra,
    }) satisfies AuthDebugInfo;

  const parsed = parseAuthorizationHeader(combined);
  const privateKey = normalizeWebDevPrivateKey(process.env.WEB_DEV_PRIVATE_KEY);
  if (!parsed || !privateKey) {
    if (combined && !privateKey) {
      console.warn("[auth] WEB_DEV_PRIVATE_KEY belum diisi; header Android diabaikan");
      return { user: null, reason: "no-key", debug: finish("no-key") };
    }
    if (combined && !parsed) {
      const desc = describeAuthorization(combined);
      if (desc.hasEnc || desc.hasKey || desc.hasSignature) {
        console.warn("[auth] Header Authorization ada tetapi bukan format ENC Key/Signature", desc);
      }
      return { user: null, reason: "unparsed", debug: finish("unparsed") };
    }
    return { user: null, reason: "no-header", debug: finish("no-header") };
  }

  const decrypted = decryptAgentHeaderDetailed(parsed.signature, privateKey, parsed.key);
  const payload = decrypted.payload;
  const payloadKeys = payload ? Object.keys(payload) : [];
  const payloadJson = payload ? JSON.stringify(redactPayload(payload), null, 2) : null;
  const debugDecrypted = finish("decrypt", {
    decryptedText: decrypted.rawText,
    payloadJson,
    payloadKeys,
  });

  if (!payload) {
    console.warn("[auth] Dekripsi header Android gagal (private key atau payload tidak cocok)");
    return { user: null, reason: "decrypt", debug: debugDecrypted };
  }

  const token = tokenFromPayload(payload);
  if (token) {
    const reused = await appdb.query("SELECT token, used_at FROM auth_tokens WHERE token = $1", [token]);
    if (reused.rowCount) {
      const usedAt = new Date(reused.rows[0].used_at).getTime();
      if (Date.now() - usedAt > TOKEN_TTL_MS) {
        return { user: null, reason: "token-expired", debug: { ...debugDecrypted, reason: "token-expired" } };
      }
    } else {
      const visitDate = new Date(dateFromPayload(payload)).getTime();
      if (!Number.isNaN(visitDate) && Date.now() - visitDate > TOKEN_TTL_MS) {
        return { user: null, reason: "token-expired", debug: { ...debugDecrypted, reason: "token-expired" } };
      }
    }
  }

  let kode = agentCodeFromPayload(payload);
  let phone = phoneFromPayload(payload);
  let name = nameFromPayload(payload);

  const reseller = kode
    ? await findReseller({ kode })
    : phone
      ? await findReseller({ phone })
      : null;

  if (reseller) {
    kode = reseller.kode;
    phone = phone || reseller.phone;
    name = name || reseller.nama;
  }

  if (!kode) {
    console.warn("[auth] Payload tanpa kode agen", { keys: payloadKeys });
    return { user: null, reason: "no-kode", debug: { ...debugDecrypted, reason: "no-kode" } };
  }

  if (token) {
    await appdb.query(
      `INSERT INTO auth_tokens (token, agent_code, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO NOTHING`,
      [token, kode, payload],
    );
  }

  const user: SessionUser = {
    role: "agent",
    kode,
    phone,
    name: name || kode,
    token: token || undefined,
  };
  const jwt = await signSession(user);
  const proto = (req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return { user, setCookie: sessionCookie(jwt, CUSTOMER_COOKIE, proto === "https"), reason: "ok" };
}
