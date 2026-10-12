import { HttpError, json, readJson } from '../../../src/server/http.js';
import { hashPassword, verifyPassword, DEFAULT_ITERATIONS } from '../../../src/server/auth.js';
import { parsePassword } from '../../../src/server/validate.js';
import { changePassword, getPasswordHash } from '../../../src/server/repo/users.js';
import { issueSessionCookie } from '../../../src/server/session.js';

// Ganti kata sandi: semua sesi lain otomatis berakhir, sesi ini diperbarui.
export async function onRequestPut({ request, env, data }) {
  const body = await readJson(request);
  const next = parsePassword(body.newPassword, 'newPassword');
  const hash = await getPasswordHash(data.sql, data.user.id);
  if (!hash || !(await verifyPassword(String(body.currentPassword ?? ''), hash))) {
    throw new HttpError(403, 'Kata sandi saat ini salah.', { field: 'currentPassword' });
  }
  const iterations = Number(env.PBKDF2_ITERATIONS) || DEFAULT_ITERATIONS;
  const user = await changePassword(data.sql, data.user.id, await hashPassword(next, iterations));
  return json({ ok: true }, 200, { 'set-cookie': await issueSessionCookie(env, request, user) });
}
