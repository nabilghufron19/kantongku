import { HttpError, json, readJson } from '../../../src/server/http.js';
import { hashPassword, DEFAULT_ITERATIONS } from '../../../src/server/auth.js';
import { isUniqueViolation } from '../../../src/server/db.js';
import { cleanText, parsePassword, parseUsername } from '../../../src/server/validate.js';
import { countUsers, createUser, isRegistrationOpen } from '../../../src/server/repo/users.js';
import { issueSessionCookie } from '../../../src/server/session.js';
import { publicUser } from '../../../src/server/plan.js';

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  const username = parseUsername(body.username);
  const password = parsePassword(body.password);
  const name = cleanText(body.name, 40, 'name') || username;

  if (!(await isRegistrationOpen(data.sql, env))) {
    throw new HttpError(403, 'Pendaftaran sedang ditutup oleh admin.');
  }

  // Admin: akun pertama, atau akun dengan nama pengguna ADMIN_USERNAME bila variabel itu diisi.
  const adminName = String(env.ADMIN_USERNAME || '').trim().toLowerCase();
  const role = adminName ? (username === adminName ? 'admin' : 'user') : (await countUsers(data.sql)) === 0 ? 'admin' : 'user';

  const iterations = Number(env.PBKDF2_ITERATIONS) || DEFAULT_ITERATIONS;
  const passwordHash = await hashPassword(password, iterations);
  const id = crypto.randomUUID();
  try {
    await createUser(data.sql, { id, username, name, passwordHash, role });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Nama pengguna sudah dipakai.', { field: 'username' });
    throw err;
  }
  const user = { id, username, name, tokenVersion: 0, role, plan: 'free', proUntil: null };
  const cookie = await issueSessionCookie(env, request, user);
  return json({ user: publicUser(user) }, 201, { 'set-cookie': cookie });
}
