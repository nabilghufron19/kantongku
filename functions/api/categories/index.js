import { HttpError, json, readJson } from '../../../src/server/http.js';
import { isUniqueViolation } from '../../../src/server/db.js';
import { parseCategoryInput } from '../../../src/server/validate.js';
import { createCategory } from '../../../src/server/repo/categories.js';

export async function onRequestPost({ request, data }) {
  const input = parseCategoryInput(await readJson(request));
  try {
    return json({ category: await createCategory(data.sql, data.user.id, input) }, 201);
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Nama kategori sudah dipakai.', { field: 'name' });
    throw err;
  }
}
