import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, errorResponse } from '../src/server/http.js';
import { hashPassword } from '../src/server/auth.js';
import { fakeSql, makeCtx, makeRequest, CAT_ID, TX_ID, USER } from './helpers.js';

import * as txRoute from '../functions/api/transactions/index.js';
import * as txIdRoute from '../functions/api/transactions/[id].js';
import * as catIdRoute from '../functions/api/categories/[id].js';
import * as budgetsRoute from '../functions/api/budgets/index.js';
import * as login from '../functions/api/auth/login.js';
import * as register from '../functions/api/auth/register.js';
import * as importRoute from '../functions/api/data/import.js';

// Menjalankan handler seperti middleware: HttpError -> respons JSON.
const call = async (fn, ctx) => { try { return await fn(ctx); } catch (e) { return errorResponse(e); } };

const TX_ROW = { id: TX_ID, type: 'out', amount: 15000, date: '2026-10-11', categoryId: CAT_ID, method: 'Tunai', note: 'bakso', createdAt: '2026-10-11T00:00:00Z' };

test('POST /transactions: sukses mengembalikan 201 dan memakai user_id sesi', async () => {
  const sql = fakeSql((t) => (t.startsWith('insert into kt_transactions') ? [TX_ROW] : []));
  const req = makeRequest('POST', '/api/transactions', { body: { type: 'out', amount: 15000, date: '2026-10-11', categoryId: CAT_ID, note: 'bakso' } });
  const res = await call(txRoute.onRequestPost, makeCtx(req, { sql }));
  assert.equal(res.status, 201);
  assert.equal((await res.json()).transaction.id, TX_ID);
  assert.ok(sql.calls[0].values.includes(USER.id), 'query wajib dibatasi user_id');
});

test('POST /transactions: input salah ditolak sebelum menyentuh database', async () => {
  const sql = fakeSql();
  const req = makeRequest('POST', '/api/transactions', { body: { type: 'out', amount: -1, date: '2026-10-11', categoryId: CAT_ID } });
  const res = await call(txRoute.onRequestPost, makeCtx(req, { sql }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'amount');
  assert.equal(sql.calls.length, 0);
});

test('POST /transactions: kategori tak cocok -> 400, bukan JSON -> 415', async () => {
  const res = await call(txRoute.onRequestPost, makeCtx(makeRequest('POST', '/api/transactions', { body: { type: 'in', amount: 5, date: '2026-10-11', categoryId: CAT_ID } }), { sql: fakeSql(() => []) }));
  assert.equal(res.status, 400);
  const raw = new Request('https://kantong.example/api/transactions', { method: 'POST', body: 'x', headers: { 'content-type': 'text/plain' } });
  assert.equal((await call(txRoute.onRequestPost, makeCtx(raw))).status, 415);
});

test('PUT dan DELETE /transactions/:id', async () => {
  const sql = fakeSql((t) => (t.startsWith('select 1') ? [{ ok: 1 }] : t.startsWith('update') ? [TX_ROW] : []));
  const put = makeRequest('PUT', `/api/transactions/${TX_ID}`, { body: { type: 'out', amount: 15000, date: '2026-10-11', categoryId: CAT_ID } });
  assert.equal((await call(txIdRoute.onRequestPut, makeCtx(put, { sql, params: { id: TX_ID } }))).status, 200);

  const del = (s) => call(txIdRoute.onRequestDelete, makeCtx(makeRequest('DELETE', `/api/transactions/${TX_ID}`), { sql: s, params: { id: TX_ID } }));
  assert.equal((await del(fakeSql(() => [{ id: TX_ID }]))).status, 200);
  assert.equal((await del(fakeSql(() => []))).status, 404);
  const bad = await call(txIdRoute.onRequestDelete, makeCtx(makeRequest('DELETE', '/api/transactions/x'), { params: { id: 'x' } }));
  assert.equal(bad.status, 400);
});

test('kategori bawaan tidak bisa dihapus', async () => {
  const sql = fakeSql((t) => (t.includes('select type, is_fallback') ? [{ type: 'out', isFallback: true }] : []));
  const res = await call(catIdRoute.onRequestDelete, makeCtx(makeRequest('DELETE', `/api/categories/${CAT_ID}`), { sql, params: { id: CAT_ID } }));
  assert.equal(res.status, 400);
});

test('hapus kategori memindahkan transaksi ke penampung', async () => {
  const FB = '44444444-4444-4444-8444-444444444444';
  const sql = fakeSql((t) => {
    if (t.includes('select type, is_fallback')) return [{ type: 'out', isFallback: false }];
    if (t.includes('and is_fallback')) return [{ id: FB }];
    if (t.includes('count(*)')) return [{ n: 7 }];
    return [];
  });
  const res = await call(catIdRoute.onRequestDelete, makeCtx(makeRequest('DELETE', `/api/categories/${CAT_ID}`), { sql, params: { id: CAT_ID } }));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.moved, 7);
  assert.equal(body.movedTo, FB);
  assert.ok(sql.calls.some((c) => c.text.startsWith('update kt_transactions set category_id')));
});

test('PUT /budgets: format salah ditolak, duplikat digabung', async () => {
  const bad = await call(budgetsRoute.onRequestPut, makeCtx(makeRequest('PUT', '/api/budgets', { body: { budgets: [] } })));
  assert.equal(bad.status, 400);
  const neg = await call(budgetsRoute.onRequestPut, makeCtx(makeRequest('PUT', '/api/budgets', { body: { budgets: { [CAT_ID]: 0 } } })));
  assert.equal(neg.status, 400);
  const sql = fakeSql();
  const ok = await call(budgetsRoute.onRequestPut, makeCtx(makeRequest('PUT', '/api/budgets', { body: { budgets: { [CAT_ID]: 500000 } } }), { sql }));
  assert.equal(ok.status, 200);
  assert.deepEqual((await ok.json()).budgets, [{ categoryId: CAT_ID, amount: 500000 }]);
});

test('login: sandi salah -> 401 + dicatat; sandi benar -> cookie HttpOnly', async () => {
  const passwordHash = await hashPassword('sandi-benar-123', 1000);
  const sql = fakeSql((t) => {
    if (t.includes('from kt_auth_attempts')) return [{ by_user: 0, by_ip: 0 }];
    if (t.includes('from kt_users where username')) return [{ ...USER, passwordHash }];
    return [];
  });
  const mk = (password) => makeCtx(makeRequest('POST', '/api/auth/login', { body: { username: 'Ali', password } }), { sql });

  const wrong = await call(login.onRequestPost, mk('sandi-salah'));
  assert.equal(wrong.status, 401);
  assert.ok(sql.calls.some((c) => c.text.startsWith('insert into kt_auth_attempts')));

  const good = await call(login.onRequestPost, mk('sandi-benar-123'));
  assert.equal(good.status, 200);
  const cookie = good.headers.get('set-cookie');
  assert.match(cookie, /^kantong_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
});

test('login: dibatasi setelah terlalu banyak kegagalan', async () => {
  const sql = fakeSql((t) => (t.includes('from kt_auth_attempts') ? [{ by_user: 10, by_ip: 0 }] : []));
  const res = await call(login.onRequestPost, makeCtx(makeRequest('POST', '/api/auth/login', { body: { username: 'ali', password: 'x' } }), { sql }));
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('retry-after'), '900');
});

test('register: tertutup jika sudah ada pengguna, terbuka untuk akun pertama', async () => {
  const mk = (n, env = {}) => makeCtx(
    makeRequest('POST', '/api/auth/register', { body: { username: 'Budi', password: 'sandi-panjang-1', name: 'Budi' } }),
    { sql: fakeSql((t) => (t.includes('count(*)') ? [{ n }] : [])), env: { PBKDF2_ITERATIONS: '1000', ...env } },
  );
  assert.equal((await call(register.onRequestPost, mk(1))).status, 403);
  assert.equal((await call(register.onRequestPost, mk(1, { ALLOW_REGISTER: 'true' }))).status, 201);
  const first = await call(register.onRequestPost, mk(0));
  assert.equal(first.status, 201);
  assert.equal((await first.json()).user.username, 'budi');
});

test('register: nama pengguna ganda -> 409', async () => {
  const dup = Object.assign(new Error('duplicate'), { code: '23505' });
  const sql = fakeSql((t) => {
    if (t.includes('count(*)')) return [{ n: 0 }];
    if (t.startsWith('insert into kt_users')) throw dup;
    return [];
  });
  const res = await call(register.onRequestPost, makeCtx(
    makeRequest('POST', '/api/auth/register', { body: { username: 'budi', password: 'sandi-panjang-1' } }),
    { sql, env: { PBKDF2_ITERATIONS: '1000' } }));
  assert.equal(res.status, 409);
});

test('impor: mode wajib valid dan rencana ditulis dalam satu transaksi', async () => {
  const body = { mode: 'replace', data: { categories: [{ id: 'a', name: 'Makan', type: 'out' }], transactions: [{ type: 'out', amount: 1000, date: '2026-10-01', categoryId: 'a' }] } };
  const sql = fakeSql();
  const res = await call(importRoute.onRequestPost, makeCtx(makeRequest('POST', '/api/data/import', { body }), { sql }));
  const out = await res.json();
  assert.equal(res.status, 200);
  assert.equal(out.imported.transactions, 1);
  const texts = sql.calls.map((c) => c.text);
  assert.ok(texts.some((t) => t.startsWith('delete from kt_transactions')));
  assert.ok(texts.some((t) => t.startsWith('insert into kt_transactions')));
  const badMode = await call(importRoute.onRequestPost, makeCtx(makeRequest('POST', '/api/data/import', { body: { ...body, mode: 'hapus' } })));
  assert.equal(badMode.status, 400);
});

test('errorResponse menyembunyikan kesalahan internal', async () => {
  const res = errorResponse(new Error('password=rahasia terbongkar'));
  assert.equal(res.status, 500);
  assert.doesNotMatch(await res.text(), /rahasia/);
  assert.equal(errorResponse(new HttpError(404, 'x')).status, 404);
});
