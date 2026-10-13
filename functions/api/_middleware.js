// Berlaku untuk semua endpoint /api/*: pengecekan asal, koneksi database, dan login.
import { HttpError, errorResponse } from '../../src/server/http.js';
import { getSql } from '../../src/server/db.js';
import { authenticate } from '../../src/server/session.js';
import { requireAdmin } from '../../src/server/plan.js';

const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/auth/config',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
]);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function guard(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

    // Perlindungan CSRF: permintaan yang mengubah data harus berasal dari situs yang sama.
    if (!SAFE_METHODS.has(request.method)) {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) throw new HttpError(403, 'Permintaan dari asal yang tidak diizinkan.');
    }

    // health memeriksa pengaturan sendiri, jadi tidak boleh gagal lebih dulu di sini
    if (path === '/api/health') return await context.next();

    context.data.sql ??= await getSql(env);
    if (!PUBLIC_PATHS.has(path)) {
      context.data.user = await authenticate(context);
      if (path.startsWith('/api/admin')) requireAdmin(context.data.user);
    }
    return await context.next();
  } catch (err) {
    return errorResponse(err);
  }
}

export const onRequest = [guard];
