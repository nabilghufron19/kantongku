import { HttpError, json, readJson } from '../../../src/server/http.js';
import { verifyPassword, DUMMY_HASH } from '../../../src/server/auth.js';
import { parseUsername } from '../../../src/server/validate.js';
import { findLoginUser } from '../../../src/server/repo/users.js';
import { issueSessionCookie } from '../../../src/server/session.js';
import { clearFailures, clientIp, ensureNotLimited, recordFailure } from '../../../src/server/ratelimit.js';

export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  const password = typeof body.password === 'string' ? body.password.slice(0, 128) : '';
  let username;
  try { username = parseUsername(body.username); } catch { throw new HttpError(401, 'Nama pengguna atau kata sandi salah.'); }

  const ip = clientIp(request);
  await ensureNotLimited(data.sql, username, ip);

  const user = await findLoginUser(data.sql, username);
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, DUMMY_HASH), false);
  if (!ok) {
    await recordFailure(data.sql, username, ip);
    throw new HttpError(401, 'Nama pengguna atau kata sandi salah.');
  }
  await clearFailures(data.sql, username);
  const cookie = await issueSessionCookie(env, request, user);
  return json({ user: { id: user.id, username: user.username, name: user.name } }, 200, { 'set-cookie': cookie });
}
