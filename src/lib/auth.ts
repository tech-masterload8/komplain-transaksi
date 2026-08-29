import { appdb } from "./db";
import {
  agentCodeFromPayload,
  decryptAgentHeader,
  describeAuthorization,
  joinHeaderValue,
  nameFromPayload,
  normalizeWebDevPrivateKey,
  parseAuthorizationHeader,
  phoneFromPayload,
} from "./decrypt";
import { findReseller } from "./otomax";
import { CUSTOMER_COOKIE, readSessionCookie, sessionCookie, signSession, verifySession, type SessionUser } from "./session";
import type { AuthIngestReason } from "./auth-reason";

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
}): Promise<{ user: SessionUser | null; setCookie?: string; reason: AuthIngestReason }> {
  const existing = await verifySession(readSessionCookie(req.headers.cookie));
  if (existing) {
    if (existing.role === "agent" && existing.kode && (!existing.name || existing.name === existing.kode)) {
      try {
        const reseller = await findReseller({ kode: existing.kode });
        if (reseller?.nama && reseller.nama !== existing.name) {
          const user: SessionUser = {
            ...existing,
            name: reseller.nama,
            phone: existing.phone || reseller.phone,
          };
          const jwt = await signSession(user);
          const proto = (req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
          return { user, setCookie: sessionCookie(jwt, CUSTOMER_COOKIE, proto === "https"), reason: "ok" };
        }
      } catch {
        /* keep the existing session */
      }
    }
    return { user: existing, reason: "has-session" };
  }

  const authorization =
    joinHeaderValue(req.headers.authorization) || joinHeaderValue(req.headers["x-authorization"]);
  const signaturePart = joinHeaderValue(req.headers.signature);
  const combined =
    authorization && signaturePart && !/Signature=/i.test(authorization)
      ? `${authorization}, Signature="${signaturePart.replace(/^["']|["']$/g, "")}"`
      : authorization;

  const parsed = parseAuthorizationHeader(combined);
  const privateKey = normalizeWebDevPrivateKey(process.env.WEB_DEV_PRIVATE_KEY);
  if (!parsed || !privateKey) {
    if (combined && !privateKey) {
      console.warn("[auth] WEB_DEV_PRIVATE_KEY belum diisi; header Android diabaikan");
      return { user: null, reason: "no-key" };
    }
    if (combined && !parsed) {
      console.warn("[auth] Header Authorization ada tetapi bukan format ENC Key/Signature", describeAuthorization(combined));
      return { user: null, reason: "unparsed" };
    }
    return { user: null, reason: "no-header" };
  }

  const payload = decryptAgentHeader(parsed.signature, privateKey, parsed.key);
  if (!payload) {
    console.warn("[auth] Dekripsi header Android gagal (private key atau payload tidak cocok)");
    return { user: null, reason: "decrypt" };
  }

  const token = String(payload.token || "");
  if (token) {
    const reused = await appdb.query("SELECT token, used_at FROM auth_tokens WHERE token = $1", [token]);
    if (reused.rowCount) {
      const usedAt = new Date(reused.rows[0].used_at).getTime();
      if (Date.now() - usedAt > TOKEN_TTL_MS) return { user: null, reason: "token-expired" };
    } else {
      if (payload.date) {
        const visitDate = new Date(String(payload.date)).getTime();
        if (!Number.isNaN(visitDate) && Date.now() - visitDate > TOKEN_TTL_MS) {
          return { user: null, reason: "token-expired" };
        }
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

  if (!kode) return { user: null, reason: "no-kode" };

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
