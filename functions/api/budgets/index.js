import { HttpError, json, readJson } from '../../../src/server/http.js';
import { parseAmount, requireUuid } from '../../../src/server/validate.js';
import { replaceBudgets } from '../../../src/server/repo/budgets.js';

// Mengganti seluruh anggaran. Body: { budgets: { "<categoryId>": jumlah, ... } }
export async function onRequestPut({ request, data }) {
  const body = await readJson(request);
  const map = body.budgets;
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new HttpError(400, 'Format anggaran tidak valid.', { field: 'budgets' });
  const entries = Object.entries(map);
  if (entries.length > 300) throw new HttpError(413, 'Terlalu banyak kategori.');
  const clean = new Map();
  for (const [id, amount] of entries) clean.set(requireUuid(id, 'budgets'), parseAmount(amount, 'budgets'));
  const list = [...clean].map(([categoryId, amount]) => ({ categoryId, amount }));
  await replaceBudgets(data.sql, data.user.id, list);
  return json({ budgets: list });
}
