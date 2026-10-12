// Menjalankan db/schema.sql ke database Neon: npm run db:migrate
// (Alternatif tanpa Node: tempel isi db/schema.sql di Neon > SQL Editor.)
import fs from 'node:fs';
import ws from 'ws';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { requireDatabaseUrl } from './env.mjs';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: requireDatabaseUrl() });
try {
  const sql = fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  const { rows } = await pool.query("select count(*)::int as n from information_schema.tables where table_name like 'kt\\_%'");
  console.log(`Skema siap. ${rows[0].n} tabel kt_* tersedia.`);
} catch (err) {
  console.error('Gagal menjalankan skema:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
