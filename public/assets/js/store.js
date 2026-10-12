// Status aplikasi di memori + semua aksi yang berbicara dengan server.
import { api } from './api.js';
import { byNewest, monthOf } from './util.js';

export const state = { user: null, cats: [], tx: [], budgets: {}, truncated: false };

export function resetState() {
  Object.assign(state, { user: null, cats: [], tx: [], budgets: {}, truncated: false });
}

function apply(d) {
  state.user = d.user;
  state.cats = d.categories;
  state.tx = d.transactions;
  state.budgets = Object.fromEntries(d.budgets.map((b) => [b.categoryId, b.amount]));
  state.truncated = Boolean(d.truncated);
}

export async function boot() { apply(await api.get('/bootstrap')); }

/* ---------- pembacaan ---------- */
export const catOf = (id) => state.cats.find((c) => c.id === id) || { id, name: '(kategori dihapus)', icon: '❔', color: '#8A8F9E', type: 'out', isFallback: false };
export const outCats = () => state.cats.filter((c) => c.type === 'out');
export const fallbackId = (type) => (state.cats.find((c) => c.type === type && c.isFallback) || {}).id;

export function monthStats(m) {
  const list = state.tx.filter((t) => monthOf(t.date) === m);
  const [y, mm] = m.split('-').map(Number);
  const byDay = Array(new Date(y, mm, 0).getDate()).fill(0);
  let inc = 0, out = 0; const byCat = {};
  for (const t of list) {
    if (t.type === 'in') inc += t.amount;
    else { out += t.amount; byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; byDay[+t.date.slice(8) - 1] += t.amount; }
  }
  return { list, inc, out, byCat, byDay };
}

/* ---------- transaksi ---------- */
export async function saveTx(input, id) {
  const { transaction } = id ? await api.put(`/transactions/${id}`, input) : await api.post('/transactions', input);
  const i = state.tx.findIndex((t) => t.id === transaction.id);
  if (i >= 0) state.tx[i] = transaction; else state.tx.push(transaction);
  state.tx.sort(byNewest);
  return transaction;
}
export async function removeTx(id) {
  await api.del(`/transactions/${id}`);
  const i = state.tx.findIndex((t) => t.id === id);
  return i >= 0 ? state.tx.splice(i, 1)[0] : null;
}
// Batalkan hapus: kirim ulang dengan ID yang sama.
export async function restoreTx(t) {
  return saveTx({ id: t.id, type: t.type, amount: t.amount, date: t.date, categoryId: t.categoryId, method: t.method, note: t.note });
}

/* ---------- kategori ---------- */
export async function saveCat(input, id) {
  const { category } = id ? await api.put(`/categories/${id}`, input) : await api.post('/categories', input);
  const i = state.cats.findIndex((c) => c.id === category.id);
  if (i >= 0) state.cats[i] = category; else state.cats.push(category);
  return category;
}
export async function removeCat(id) {
  const r = await api.del(`/categories/${id}`);
  state.tx.forEach((t) => { if (t.categoryId === id) t.categoryId = r.movedTo; });
  delete state.budgets[id];
  state.cats = state.cats.filter((c) => c.id !== id);
  return r;
}

/* ---------- anggaran ---------- */
export async function setBudget(categoryId, amount) {
  await api.put(`/budgets/${categoryId}`, { amount });
  if (amount) state.budgets[categoryId] = amount; else delete state.budgets[categoryId];
}
export async function replaceBudgets(map) {
  await api.put('/budgets', { budgets: map });
  state.budgets = { ...map };
}

/* ---------- data ---------- */
export const exportData = () => api.get('/data/export');
export async function importData(data, mode) {
  const r = await api.post('/data/import', { mode, data });
  await boot();
  return r;
}
export async function clearData() {
  await api.del('/data');
  state.tx = []; state.budgets = {};
}

/* ---------- akun ---------- */
export async function login(username, password) { await api.post('/auth/login', { username, password }); await boot(); }
export async function register(name, username, password) { await api.post('/auth/register', { name, username, password }); await boot(); }
export async function logout() { try { await api.post('/auth/logout'); } finally { resetState(); } }
export const changePassword = (currentPassword, newPassword) => api.put('/account/password', { currentPassword, newPassword });
export async function deleteAccount(password) { await api.del('/account', { password }); resetState(); }
export async function renameUser(name) { const { user } = await api.patch('/account', { name }); state.user = user; }
