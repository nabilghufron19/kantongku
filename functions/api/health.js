// Pemeriksaan pengaturan tanpa membocorkan rahasia: GET /api/health
import { json } from '../../src/server/http.js';
import { getSql } from '../../src/server/db.js';

export async function onRequestGet({ env, data }) {
  const status = {
    ok: false,
    databaseUrl: Boolean(env.DATABASE_URL),
    jwtSecret: Boolean(env.JWT_SECRET && env.JWT_SECRET.length >= 16),
    database: false,
    schema: false,
  };
  try {
    const sql = data.sql ?? (await getSql(env));
    const rows = await sql`select to_regclass('public.kt_users') is not null as schema_ok`;
    status.database = true;
    status.schema = Boolean(rows[0] && rows[0].schema_ok);
  } catch (err) {
    console.error('health:', err);
  }
  status.ok = status.databaseUrl && status.jwtSecret && status.database && status.schema;
  return json(status, status.ok ? 200 : 503);
}
