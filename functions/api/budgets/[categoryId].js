import { json, readJson } from '../../../src/server/http.js';
import { parseBudgetAmount, requireUuid } from '../../../src/server/validate.js';
import { setBudget } from '../../../src/server/repo/budgets.js';

// Body: { amount } — 0 berarti hapus batas.
export async function onRequestPut({ request, params, data }) {
  const categoryId = requireUuid(params.categoryId, 'categoryId');
  const { amount } = await readJson(request);
  const row = await setBudget(data.sql, data.user.id, categoryId, parseBudgetAmount(amount));
  return json({ budget: row });
}
