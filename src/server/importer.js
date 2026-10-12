// Impor cadangan: normalisasi file JSON (format Kantong v2 maupun cadangan lama v1
// dari versi index.html tunggal) lalu susun rencana penulisan ke database.
// Seluruh fungsi di sini murni (tanpa akses database) sehingga mudah diuji.
import { HttpError } from './http.js';
import { FALLBACK_DEFAULTS } from './defaults.js';
import {
  isUuid, parseType, parseAmount, parseDate, parseBudgetAmount, cleanText, safeColor, safeIcon,
} from './validate.js';

export const MAX_IMPORT_TX = 20_000;
export const MAX_IMPORT_CATS = 300;

const lower = (s) => s.toLowerCase();
const catKey = (name, type) => `${type}|${lower(name)}`;

export function normalizeImport(payload) {
  if (!payload || typeof payload !== 'object') throw new HttpError(400, 'Format cadangan tidak dikenali.');
  const rawCats = Array.isArray(payload.categories) ? payload.categories : Array.isArray(payload.cats) ? payload.cats : [];
  const rawTx = Array.isArray(payload.transactions) ? payload.transactions : Array.isArray(payload.tx) ? payload.tx : null;
  if (!rawTx) throw new HttpError(400, 'File cadangan tidak memuat daftar transaksi.');
  if (rawTx.length > MAX_IMPORT_TX) throw new HttpError(413, `Maksimal ${MAX_IMPORT_TX} transaksi per impor.`);
  if (rawCats.length > MAX_IMPORT_CATS) throw new HttpError(413, `Maksimal ${MAX_IMPORT_CATS} kategori per impor.`);

  let skipped = 0;

  const categories = [];
  for (const c of rawCats) {
    try {
      if (!c || typeof c !== 'object') throw new Error('x');
      categories.push({
        key: String(c.id ?? c.name),
        name: cleanText(c.name, 40, 'name', { required: true }),
        icon: safeIcon(c.icon),
        color: safeColor(c.color),
        type: parseType(c.type),
        isFallback: c.isFallback === true || c.is_fallback === true,
      });
    } catch { skipped++; }
  }

  const transactions = [];
  for (const t of rawTx) {
    try {
      if (!t || typeof t !== 'object') throw new Error('x');
      const catRef = t.categoryId ?? t.cat ?? null;
      transactions.push({
        id: isUuid(t.id) ? t.id.toLowerCase() : null,
        type: parseType(t.type),
        amount: parseAmount(t.amount),
        date: parseDate(t.date),
        catKey: catRef === null ? null : String(catRef),
        method: cleanText(t.method ?? 'Tunai', 30, 'method') || 'Tunai',
        note: cleanText(t.note, 120, 'note'),
      });
    } catch { skipped++; }
  }

  const budgets = [];
  const rawBudgets = payload.budgets;
  const pairs = Array.isArray(rawBudgets)
    ? rawBudgets.map((b) => [b && (b.categoryId ?? b.cat), b && b.amount])
    : rawBudgets && typeof rawBudgets === 'object' ? Object.entries(rawBudgets) : [];
  for (const [ref, amount] of pairs) {
    try {
      const n = parseBudgetAmount(amount);
      if (ref === undefined || ref === null || n === 0) throw new Error('x');
      budgets.push({ catKey: String(ref), amount: n });
    } catch { skipped++; }
  }

  return { categories, transactions, budgets, skipped };
}

/**
 * existing: { categories: [{id,name,type,isFallback}], maxPosition } (diabaikan pada mode "replace")
 * mode: 'merge' | 'replace'
 */
export function buildImportPlan(data, existing, mode, genId = () => crypto.randomUUID()) {
  const replace = mode === 'replace';
  const known = replace ? [] : existing.categories;
  const idByName = new Map(known.map((c) => [catKey(c.name, c.type), c.id]));
  const typeById = new Map(known.map((c) => [c.id, c.type]));
  const keyToId = new Map();
  const inserts = [];
  let position = replace ? 0 : existing.maxPosition || 0;

  for (const c of data.categories) {
    const k = catKey(c.name, c.type);
    let id = idByName.get(k);
    if (!id) {
      id = genId();
      idByName.set(k, id);
      typeById.set(id, c.type);
      inserts.push({ id, name: c.name, icon: c.icon, color: c.color, type: c.type, isFallback: false, position: ++position, wantsFallback: c.isFallback });
    }
    keyToId.set(c.key, id);
  }

  // Pastikan tiap jenis punya tepat satu kategori penampung.
  const fallbackId = {};
  for (const type of ['out', 'in']) {
    const current = known.find((c) => c.type === type && c.isFallback);
    if (current) { fallbackId[type] = current.id; continue; }
    const mine = inserts.filter((c) => c.type === type);
    const chosen = mine.find((c) => c.wantsFallback) || mine.find((c) => lower(c.name) === lower(FALLBACK_DEFAULTS[type].name));
    if (chosen) { chosen.isFallback = true; fallbackId[type] = chosen.id; continue; }
    const d = FALLBACK_DEFAULTS[type];
    const id = genId();
    typeById.set(id, type);
    inserts.push({ id, name: d.name, icon: d.icon, color: d.color, type, isFallback: true, position: ++position });
    fallbackId[type] = id;
  }
  for (const c of inserts) delete c.wantsFallback;

  const transactions = data.transactions.map((t) => {
    let categoryId = t.catKey === null ? null : keyToId.get(t.catKey) ?? null;
    if (!categoryId || typeById.get(categoryId) !== t.type) categoryId = fallbackId[t.type];
    return { id: t.id || genId(), categoryId, type: t.type, amount: t.amount, date: t.date, method: t.method, note: t.note };
  });

  const budgetMap = new Map();
  for (const b of data.budgets) {
    const id = keyToId.get(b.catKey);
    if (id && typeById.get(id) === 'out') budgetMap.set(id, b.amount);
  }
  const budgets = [...budgetMap].map(([categoryId, amount]) => ({ categoryId, amount }));

  return { replace, categories: inserts, transactions, budgets, skipped: data.skipped };
}
