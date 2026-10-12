import { HttpError, json, readJson } from '../../../src/server/http.js';
import { isUniqueViolation } from '../../../src/server/db.js';
import { parseCategoryInput, requireUuid } from '../../../src/server/validate.js';
import { deleteCategory, updateCategory } from '../../../src/server/repo/categories.js';

export async function onRequestPut({ request, params, data }) {
  const id = requireUuid(params.id);
  const input = parseCategoryInput(await readJson(request), { withType: false });
  try {
    return json({ category: await updateCategory(data.sql, data.user.id, id, input) });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Nama kategori sudah dipakai.', { field: 'name' });
    throw err;
  }
}

export async function onRequestDelete({ params, data }) {
  const result = await deleteCategory(data.sql, data.user.id, requireUuid(params.id));
  return json({ ok: true, ...result });
}
