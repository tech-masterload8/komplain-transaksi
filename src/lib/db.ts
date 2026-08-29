import { Pool, type PoolConfig } from "pg";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

function poolConfig(prefix: "OTOMAX" | "APP", extra?: PoolConfig): PoolConfig {
  const fallbackPrefix = prefix === "APP" ? "OTOMAX" : "APP";
  const env = (key: string, fallbackKey?: string) =>
    process.env[`${prefix}_DB_${key}`] ||
    (fallbackKey ? process.env[`${fallbackPrefix}_DB_${fallbackKey}`] : undefined) ||
    process.env[`${fallbackPrefix}_DB_${key}`];

  return {
    host: env("HOST") || "127.0.0.1",
    port: Number(env("PORT") || 5432),
    database:
      prefix === "OTOMAX"
        ? process.env.OTOMAX_DB_NAME || "otomaxbank"
        : process.env.APP_DB_NAME || "komplain",
    user: env("USER") || "bankdb",
    password: env("PASSWORD") || "",
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ...extra,
  };
}

/** OtoMax source data. Application code must only SELECT. */
export const otomax = new Pool(
  poolConfig("OTOMAX", {
    options: "-c default_transaction_read_only=on -c statement_timeout=15000",
  }),
);

/** Complaint chats, staff, and sessions. */
export const appdb = new Pool(poolConfig("APP"));

export async function closeDb() {
  await Promise.allSettled([otomax.end(), appdb.end()]);
}
