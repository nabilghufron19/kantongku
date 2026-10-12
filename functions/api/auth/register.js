import { HttpError, json, readJson } from '../../../src/server/http.js';
import { hashPassword, DEFAULT_ITERATIONS } from '../../../src/server/auth.js';
import { isUniqueViolation } from '../../../src/server/db.js';
import { cleanText, parsePassword, parseUsername } from '../../../src/server/validate.js';
import { createUser, isRegistrationOpen } from '../../../src/server/repo/users.js';
import { issueSessionCookie } from '../../../src/server/session.js';

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  const username = parseUsername(body.username);
  const password = parsePassword(body.password);
  const name = cleanText(body.name, 40, 'name') || username;

  if (!(await isRegistrationOpen(data.sql, env))) {
    throw new HttpError(403, 'Pendaftaran ditutup. Minta pemilik aplikasi mengaktifkannya (ALLOW_REGISTER=true).');
  }

  const iterations = Number(env.PBKDF2_ITERATIONS) || DEFAULT_ITERATIONS;
  const passwordHash = await hashPassword(password, iterations);
  const id = crypto.randomUUID();
  try {
    await createUser(data.sql, { id, username, name, passwordHash });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Nama pengguna sudah dipakai.', { field: 'username' });
    throw err;
  }
  const user = { id, username, name, tokenVersion: 0 };
  const cookie = await issueSessionCookie(env, request, user);
  return json({ user: { id, username, name } }, 201, { 'set-cookie': cookie });
}
