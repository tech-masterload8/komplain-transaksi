import { appdb } from "./db";
import {
  agentCodeFromPayload,
  decryptAgentHeader,
  nameFromPayload,
  parseAuthorizationHeader,
  phoneFromPayload,
} from "./decrypt";
import { findReseller } from "./otomax";
import { CUSTOMER_COOKIE, readSessionCookie, sessionCookie, signSession, verifySession, type SessionUser } from "./session";

const TOKEN_TTL_MS = 5 * 60 * 1000;

export async function getUserFromRequest(req: { headers: { cookie?: string; authorization?: string } }) {
  const existing = await verifySession(readSessionCookie(req.headers.cookie));
  if (existing) return existing;
  return null;
}

export async function ingestAuthorization(req: {
  headers: { cookie?: string; authorization?: string; "x-forwarded-proto"?: string };
}): Promise<{ user: SessionUser | null; setCookie?: string }> {
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
          return { user, setCookie: sessionCookie(jwt, CUSTOMER_COOKIE, proto === "https") };
        }
      } catch {
        /* keep the existing session */
      }
    }
    return { user: existing };
  }

  const parsed = parseAuthorizationHeader(req.headers.authorization);
  const privateKey = process.env.WEB_DEV_PRIVATE_KEY || "";
  if (!parsed || !privateKey) return { user: null };

  const payload = decryptAgentHeader(parsed.signature, privateKey, parsed.key);
  if (!payload) return { user: null };

  const token = String(payload.token || "");
  if (token) {
    const reused = await appdb.query("SELECT token, used_at FROM auth_tokens WHERE token = $1", [token]);
    if (reused.rowCount) {
      const usedAt = new Date(reused.rows[0].used_at).getTime();
      if (Date.now() - usedAt > TOKEN_TTL_MS) return { user: null };
    } else {
      if (payload.date) {
        const visitDate = new Date(String(payload.date)).getTime();
        if (!Number.isNaN(visitDate) && Date.now() - visitDate > TOKEN_TTL_MS) return { user: null };
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

  if (!kode) return { user: null };

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
  return { user, setCookie: sessionCookie(jwt, CUSTOMER_COOKIE, proto === "https") };
}
