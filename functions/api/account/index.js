import { HttpError, json, readJson } from '../../../src/server/http.js';
import { verifyPassword } from '../../../src/server/auth.js';
import { cleanText } from '../../../src/server/validate.js';
import { deleteUser, getPasswordHash, updateName } from '../../../src/server/repo/users.js';
import { clearSessionCookie } from '../../../src/server/session.js';

export async function onRequestPatch({ request, data }) {
  const body = await readJson(request);
  const name = cleanText(body.name, 40, 'name', { required: true });
  const user = await updateName(data.sql, data.user.id, name);
  return json({ user: { id: user.id, username: user.username, name: user.name } });
}

// Menghapus akun beserta seluruh datanya (wajib konfirmasi kata sandi).
export async function onRequestDelete({ request, data }) {
  const body = await readJson(request);
  const hash = await getPasswordHash(data.sql, data.user.id);
  if (!hash || !(await verifyPassword(String(body.password ?? ''), hash))) {
    throw new HttpError(403, 'Kata sandi salah.', { field: 'password' });
  }
  await deleteUser(data.sql, data.user.id);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
}
