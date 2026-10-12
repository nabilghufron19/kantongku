// Atur ulang kata sandi (jika lupa): npm run user:reset -- <nama_pengguna> <sandi_baru>
// Semua sesi login lama ikut dicabut.
import ws from 'ws';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { requireDatabaseUrl } from './env.mjs';
import { hashPassword } from '../src/server/auth.js';

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 8) {
  console.error('Pemakaian: npm run user:reset -- <nama_pengguna> <sandi_baru_min_8_karakter>');
  process.exit(1);
}
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: requireDatabaseUrl() });
try {
  const hash = await hashPassword(password);
  const r = await pool.query(
    'update kt_users set password_hash = $1, token_version = token_version + 1 where username = $2',
    [hash, username.trim().toLowerCase()],
  );
  console.log(r.rowCount ? 'Kata sandi diganti.' : 'Nama pengguna tidak ditemukan.');
  process.exitCode = r.rowCount ? 0 : 1;
} finally {
  await pool.end();
}
