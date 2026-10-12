// Koneksi Neon (driver HTTP serverless, cocok untuk Cloudflare Workers/Pages).
import { HttpError } from './http.js';

let neonFn;

export async function getSql(env) {
  const url = env && env.DATABASE_URL;
  if (!url) {
    throw new HttpError(500, 'DATABASE_URL belum diatur. Tambahkan di Cloudflare Pages > Settings > Variables and Secrets.');
  }
  // import dinamis: modul hanya dimuat saat benar-benar dibutuhkan (memudahkan pengujian tanpa database)
  neonFn ??= (await import('@neondatabase/serverless')).neon;
  return neonFn(url);
}

export const isUniqueViolation = (e) => Boolean(e) && e.code === '23505';
