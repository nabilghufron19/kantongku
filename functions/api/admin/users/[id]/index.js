import { HttpError, json, readJson } from '../../../../../src/server/http.js';
import { parseAdminPatch, requireUuid } from '../../../../../src/server/validate.js';
import { requireAdmin } from '../../../../../src/server/plan.js';
import { applyPatch, countOtherAdmins, getUser } from '../../../../../src/server/repo/admin.js';
import { deleteUser } from '../../../../../src/server/repo/users.js';

// Mengatur role dan paket pengguna.
export async function onRequestPatch({ request, params, data }) {
  requireAdmin(data.user);
  const id = requireUuid(params.id);
  const patch = parseAdminPatch(await readJson(request));
  const target = await getUser(data.sql, id);
  if (!target) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  if (patch.role === 'user' && target.role === 'admin' && (await countOtherAdmins(data.sql, id)) === 0) {
    throw new HttpError(400, 'Tidak bisa menurunkan admin terakhir. Jadikan pengguna lain admin lebih dulu.', { field: 'role' });
  }
  await applyPatch(data.sql, id, patch);
  return json({ user: await getUser(data.sql, id) });
}

export async function onRequestDelete({ params, data }) {
  requireAdmin(data.user);
  const id = requireUuid(params.id);
  if (id === data.user.id) throw new HttpError(400, 'Untuk menghapus akun sendiri, gunakan Pengaturan > Hapus akun.');
  const target = await getUser(data.sql, id);
  if (!target) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  if (target.role === 'admin' && (await countOtherAdmins(data.sql, id)) === 0) {
    throw new HttpError(400, 'Tidak bisa menghapus admin terakhir.');
  }
  await deleteUser(data.sql, id);
  return json({ ok: true });
}
