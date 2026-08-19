import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import { loadEnvFiles } from "../src/lib/load-env";

loadEnvFiles();

function env(name: string, fallback = "") {
  return process.env[name] || fallback;
}

function pgCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code || "") : "";
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function connect(opts: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  label: string;
}) {
  const client = new Client({
    host: opts.host,
    port: opts.port,
    user: opts.user,
    password: opts.password,
    database: opts.database,
  });
  try {
    await client.connect();
    console.log(`Terhubung ${opts.label}: ${opts.user}@${opts.host}:${opts.port}/${opts.database}`);
    return client;
  } catch (error) {
    await client.end().catch(() => undefined);
    const code = pgCode(error);
    if (code === "28P01") {
      throw new Error(
        `Password PostgreSQL ditolak untuk user "${opts.user}" ke database "${opts.database}" (${opts.label}). ` +
          `Cek ${opts.label.startsWith("otomax") ? "OTOMAX_DB_USER / OTOMAX_DB_PASSWORD" : "APP_DB_USER / APP_DB_PASSWORD"} di env Compose, lalu Recreate container.`,
      );
    }
    throw error;
  }
}

async function ensureAppDatabase(opts: {
  host: string;
  port: number;
  otoUser: string;
  otoPassword: string;
  otoDatabase: string;
  appUser: string;
  appPassword: string;
  appDatabase: string;
}) {
  const admin = await connect({
    host: opts.host,
    port: opts.port,
    user: opts.otoUser,
    password: opts.otoPassword,
    database: opts.otoDatabase,
    label: "otomax-admin",
  });
  try {
    const role = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [opts.appUser]);
    if (!role.rowCount) {
      try {
        await admin.query(
          `CREATE ROLE ${quoteIdent(opts.appUser)} LOGIN PASSWORD ${quoteLiteral(opts.appPassword)}`,
        );
        console.log(`Role ${opts.appUser} dibuat`);
      } catch (error) {
        throw new Error(
          `User PostgreSQL "${opts.appUser}" belum ada dan user "${opts.otoUser}" tidak bisa membuatnya. Buat user + database "${opts.appDatabase}" di aaPanel PostgreSQL. (${(error as Error).message})`,
        );
      }
    }

    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [opts.appDatabase]);
    if (!exists.rowCount) {
      try {
        await admin.query(
          `CREATE DATABASE ${quoteIdent(opts.appDatabase)} OWNER ${quoteIdent(opts.appUser)}`,
        );
        console.log(`Database ${opts.appDatabase} dibuat`);
      } catch (error) {
        throw new Error(
          `Gagal membuat database "${opts.appDatabase}". Buat database itu di aaPanel PostgreSQL, owner "${opts.appUser}". (${(error as Error).message})`,
        );
      }
    } else {
      console.log(`Database ${opts.appDatabase} sudah ada`);
    }

    await admin.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${quoteIdent(opts.appDatabase)} TO ${quoteIdent(opts.appUser)}`,
    );
  } finally {
    await admin.end();
  }
}

async function main() {
  const host = env("APP_DB_HOST", env("OTOMAX_DB_HOST", "127.0.0.1"));
  const port = Number(env("APP_DB_PORT", env("OTOMAX_DB_PORT", "5432")));
  const otoUser = env("OTOMAX_DB_USER", "bankdb");
  const otoPassword = env("OTOMAX_DB_PASSWORD");
  const otoDatabase = env("OTOMAX_DB_NAME", "otomaxbank");
  const appUser = env("APP_DB_USER", otoUser);
  const appPassword = env("APP_DB_PASSWORD", otoPassword);
  const appDatabase = env("APP_DB_NAME", "komplain");

  if (!otoPassword) {
    throw new Error("OTOMAX_DB_PASSWORD wajib diisi (user bankdb / otomaxbank).");
  }
  if (!appPassword) {
    throw new Error("APP_DB_PASSWORD wajib diisi (user database aplikasi).");
  }

  console.log(`Migrasi: app=${appUser}@${appDatabase} otomax=${otoUser}@${otoDatabase} host=${host}:${port}`);

  let app: Client;
  try {
    app = await connect({
      host,
      port,
      user: appUser,
      password: appPassword,
      database: appDatabase,
      label: "app",
    });
  } catch (error) {
    const code = pgCode(error);
    const message = error instanceof Error ? error.message : String(error);
    const missingDb = code === "3D000" || /database .* does not exist/i.test(message);
    if (!missingDb) throw error;

    console.log(`Database ${appDatabase} belum bisa diakses, bootstrap lewat ${otoUser}@${otoDatabase}`);
    await ensureAppDatabase({
      host,
      port,
      otoUser,
      otoPassword,
      otoDatabase,
      appUser,
      appPassword,
      appDatabase,
    });
    app = await connect({
      host,
      port,
      user: appUser,
      password: appPassword,
      database: appDatabase,
      label: "app",
    });
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
