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
  await runSqlFile(app, "002_schema.sql");
  await runSqlFile(app, "003_tickets.sql");
  await runSqlFile(app, "004_staff_username.sql");
  console.log("Skema database aplikasi diterapkan");

  await seedSuperAdmin(app);

  await app.end();
}

async function runSqlFile(client: Client, filename: string) {
  const schema = fs.readFileSync(path.join(process.cwd(), "sql", filename), "utf8");
  await client.query(schema);
}

async function seedSuperAdmin(client: Client) {
  const username = env("SUPERADMIN_USERNAME", "steinway").trim();
  const password = env("SUPERADMIN_PASSWORD", "Luminous1ty");
  const name = env("SUPERADMIN_NAME", "Steinway");
  if (!username || !password) return;

  const existing = await client.query("SELECT id FROM staff_users WHERE lower(username) = lower($1)", [username]);
  if (existing.rowCount && env("SUPERADMIN_RESET_PASSWORD") !== "true") {
    await client.query("UPDATE staff_users SET role = 'superadmin', name = COALESCE(NULLIF(name, ''), $2) WHERE id = $1", [
      existing.rows[0].id,
      name,
    ]);
    console.log(`Super admin ${username} sudah ada`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  if (existing.rowCount) {
    await client.query(
      `UPDATE staff_users SET password_hash = $2, name = $3, role = 'superadmin' WHERE id = $1`,
      [existing.rows[0].id, hash, name],
    );
    console.log(`Password super admin ${username} direset`);
    return;
  }

  await client.query(
    `INSERT INTO staff_users (username, password_hash, name, role)
     VALUES ($1, $2, $3, 'superadmin')`,
    [username, hash, name],
  );
  console.log(`Super admin ${username} dibuat`);
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
