import { HttpError, json } from '../../../../../src/server/http.js';
import { hashPassword, randomPassword, DEFAULT_ITERATIONS } from '../../../../../src/server/auth.js';
import { requireUuid } from '../../../../../src/server/validate.js';
import { requireAdmin } from '../../../../../src/server/plan.js';
import { getUser, setPasswordHash } from '../../../../../src/server/repo/admin.js';

// Membuat kata sandi sementara (ditampilkan sekali). Semua sesi pengguna itu dicabut.
export async function onRequestPost({ params, env, data }) {
  requireAdmin(data.user);
  const id = requireUuid(params.id);
  if (!(await getUser(data.sql, id))) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  const temporaryPassword = randomPassword(10);
  const iterations = Number(env.PBKDF2_ITERATIONS) || DEFAULT_ITERATIONS;
  await setPasswordHash(data.sql, id, await hashPassword(temporaryPassword, iterations));
  return json({ temporaryPassword });
}
