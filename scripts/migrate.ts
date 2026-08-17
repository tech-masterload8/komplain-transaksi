import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import { loadEnvFiles } from "../src/lib/load-env";

loadEnvFiles();

function env(name: string, fallback = "") {
  return process.env[name] || fallback;
}

async function main() {
  const host = env("APP_DB_HOST", env("OTOMAX_DB_HOST", "127.0.0.1"));
  const port = Number(env("APP_DB_PORT", env("OTOMAX_DB_PORT", "5432")));
  const user = env("APP_DB_USER", env("OTOMAX_DB_USER", "bankdb"));
  const password = env("APP_DB_PASSWORD", env("OTOMAX_DB_PASSWORD"));
  const dbName = env("APP_DB_NAME", "komplain");

  const app = new Client({ host, port, user, password, database: dbName });
  try {
    await app.connect();
    console.log(`Database ${dbName} already exists`);
  } catch {
    const admin = new Client({
      host,
      port,
      user,
      password,
      database: env("OTOMAX_DB_NAME", "otomaxbank"),
    });
    await admin.connect();
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (!exists.rowCount) {
      await admin.query(`CREATE DATABASE ${quoteIdent(dbName)} OWNER ${quoteIdent(user)}`);
      console.log(`Created database ${dbName}`);
    }
    await admin.end();
    await app.connect();
  }
  await ensureGenRandomUuid(app);
  const schema = fs.readFileSync(path.join(process.cwd(), "sql", "002_schema.sql"), "utf8");
  await app.query(schema);
  const upgrade = fs.readFileSync(path.join(process.cwd(), "sql", "003_tickets.sql"), "utf8");
  await app.query(upgrade);
  console.log("Skema database aplikasi diterapkan");

  const phone = env("CS_PHONE");
  const pin = env("CS_PIN");
  const name = env("CS_NAME", "Customer Service");
  if (phone && pin) {
    const hash = await bcrypt.hash(pin, 10);
    await app.query(
      `INSERT INTO staff_users (phone, pin_hash, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (phone) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, name = EXCLUDED.name`,
      [phone, hash, name],
    );
    console.log(`Upserted CS user ${phone}`);
  }

  await app.end();
}

async function ensureGenRandomUuid(client: Client) {
  const check = await client.query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE p.proname = 'gen_random_uuid'
         AND n.nspname IN ('pg_catalog', 'public')
     ) AS ok`,
  );
  if (check.rows[0]?.ok) return;
  await client.query(`
    CREATE OR REPLACE FUNCTION public.gen_random_uuid()
    RETURNS uuid
    LANGUAGE sql
    AS $$ SELECT md5(random()::text || clock_timestamp()::text)::uuid $$
  `);
  console.log("Added gen_random_uuid() fallback (pgcrypto not installed)");
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
