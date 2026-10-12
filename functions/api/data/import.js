import { HttpError, json, readJson } from '../../../src/server/http.js';
import { buildImportPlan, normalizeImport } from '../../../src/server/importer.js';
import { applyImportPlan, loadExistingCategories } from '../../../src/server/repo/data.js';

// Body: { mode: 'merge' | 'replace', data: <isi file cadangan> }
export async function onRequestPost({ request, data }) {
  const body = await readJson(request, 8_000_000);
  const mode = body.mode === 'replace' ? 'replace' : body.mode === 'merge' ? 'merge' : null;
  if (!mode) throw new HttpError(400, 'mode harus "merge" atau "replace".', { field: 'mode' });
  const normalized = normalizeImport(body.data);
  const existing = mode === 'merge' ? await loadExistingCategories(data.sql, data.user.id) : null;
  const plan = buildImportPlan(normalized, existing, mode);
  await applyImportPlan(data.sql, data.user.id, plan);
  return json({
    ok: true,
    imported: { categories: plan.categories.length, transactions: plan.transactions.length, budgets: plan.budgets.length },
    skipped: plan.skipped,
  });
}
