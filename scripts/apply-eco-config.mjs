// Aplica una migracion .sql a la BD Supabase usando SUPABASE_DB_URL.
// Uso:
//   vercel env pull .env.migrate --environment=production --yes
//   node scripts/apply-eco-config.mjs
//
// Lee SUPABASE_DB_URL de process.env o del archivo .env.migrate del cwd.
import { readFileSync, existsSync } from "node:fs";
import { Pool } from "pg";

const MIGRATION = "supabase/migrations/20260524_eco_admin_config.sql";

function getDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const envFile = ".env.migrate";
  if (existsSync(envFile)) {
    const txt = readFileSync(envFile, "utf8");
    const m = txt.match(/SUPABASE_DB_URL\s*=\s*"?([^"\r\n]+)"?/);
    if (m) return m[1];
  }
  return null;
}

const url = getDbUrl();
if (!url) {
  console.error("ERROR: SUPABASE_DB_URL no encontrado (env ni .env.migrate)");
  process.exit(1);
}

const sql = readFileSync(MIGRATION, "utf8");
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1 });

try {
  await pool.query(sql);
  const { rows } = await pool.query("select key, updated_at from eco_admin_config order by key");
  console.log("OK migracion aplicada. Filas:", JSON.stringify(rows));
} catch (e) {
  console.error("FALLO:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
