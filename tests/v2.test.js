import test from 'node:test';
import assert from 'node:assert/strict';
import { errorResponse } from '../src/server/http.js';
import { isProUser, publicUser } from '../src/server/plan.js';
import { randomPassword } from '../src/server/auth.js';
import { parseAdminPatch, parseGoalInput, parseDeposit } from '../src/server/validate.js';
import { fakeSql, makeCtx, makeRequest, USER, PRO, ADMIN, CAT_ID } from './helpers.js';

import * as goalsRoute from '../functions/api/goals/index.js';
import * as goalIdRoute from '../functions/api/goals/[id]/index.js';
import * as depositRoute from '../functions/api/goals/[id]/deposit.js';
import * as adminUsers from '../functions/api/admin/users/index.js';
import * as adminUser from '../functions/api/admin/users/[id]/index.js';
import * as adminReset from '../functions/api/admin/users/[id]/reset-password.js';
import * as bootstrap from '../functions/api/bootstrap.js';
import * as me from '../functions/api/auth/me.js';

const call = async (fn, ctx) => { try { return await fn(ctx); } catch (e) { return errorResponse(e); } };
const GOAL_ID = '77777777-7777-4777-8777-777777777777';
const TARGET_ID = '88888888-8888-4888-8888-888888888888';
const GOAL = { id: GOAL_ID, name: 'Laptop', icon: '💻', color: '#2E3FA3', targetAmount: 6000000, savedAmount: 500000, deadline: null, createdAt: '2026-10-01T00:00:00Z' };

test('isProUser: admin, pro selamanya, pro berbatas waktu, gratis', () => {
  const now = Date.parse('2026-10-13T00:00:00Z');
  assert.equal(isProUser({ role: 'admin', plan: 'free' }, now), true);
  assert.equal(isProUser({ role: 'user', plan: 'free' }, now), false);
  assert.equal(isProUser({ role: 'user', plan: 'pro', proUntil: null }, now), true);
  assert.equal(isProUser({ role: 'user', plan: 'pro', proUntil: '2026-11-01T00:00:00Z' }, now), true);
  assert.equal(isProUser({ role: 'user', plan: 'pro', proUntil: new Date('2026-10-01') }, now), false, 'Pro yang sudah lewat masa berlaku');
  assert.equal(isProUser(null), false);
  assert.deepEqual(Object.keys(publicUser({ ...USER })).sort(), ['id', 'isPro', 'name', 'plan', 'proUntil', 'role', 'username']);
});

test('kata sandi sementara: panjang, karakter aman, acak', () => {
  const a = randomPassword(10), b = randomPassword(10);
  assert.equal(a.length, 10);
  assert.match(a, /^[A-HJ-NP-Za-km-z2-9]+$/);
  assert.notEqual(a, b);
});

test('validasi: perubahan admin, target tabungan, setoran', () => {
  assert.deepEqual(parseAdminPatch({ role: 'admin' }), { role: 'admin' });
  assert.deepEqual(parseAdminPatch({ plan: 'pro', proDays: 30 }), { plan: 'pro', proDays: 30 });
  assert.deepEqual(parseAdminPatch({ plan: 'pro', lifetime: true }), { plan: 'pro', lifetime: true });
  assert.deepEqual(parseAdminPatch({ plan: 'free' }), { plan: 'free' });
  for (const bad of [{}, { role: 'owner' }, { plan: 'gold' }, { plan: 'pro' }, { plan: 'pro', proDays: 0 }, { plan: 'pro', proDays: 99999 }, { plan: 'pro', proDays: 1.5 }]) {
    assert.throws(() => parseAdminPatch(bad), (e) => e.status === 400, JSON.stringify(bad));
  }
  assert.deepEqual(parseGoalInput({ name: ' Laptop ', targetAmount: 6000000, deadline: '2027-01-31' }),
    { name: 'Laptop', icon: '🎯', color: '#2E3FA3', targetAmount: 6000000, deadline: '2027-01-31' });
  assert.throws(() => parseGoalInput({ name: 'x', targetAmount: 0 }), (e) => e.field === 'targetAmount');
  assert.equal(parseDeposit({ amount: -5000 }), -5000);
  assert.throws(() => parseDeposit({ amount: 0 }), (e) => e.field === 'amount');
});

test('target tabungan: pengguna gratis ditolak 403 pro_required tanpa menyentuh database', async () => {
  const sql = fakeSql();
  const cases = [
    [goalsRoute.onRequestGet, makeRequest('GET', '/api/goals'), {}],
    [goalsRoute.onRequestPost, makeRequest('POST', '/api/goals', { body: { name: 'x', targetAmount: 100 } }), {}],
    [goalIdRoute.onRequestDelete, makeRequest('DELETE', `/api/goals/${GOAL_ID}`), { id: GOAL_ID }],
    [depositRoute.onRequestPost, makeRequest('POST', `/api/goals/${GOAL_ID}/deposit`, { body: { amount: 100 } }), { id: GOAL_ID }],
  ];
  for (const [fn, req, params] of cases) {
    const res = await call(fn, makeCtx(req, { sql, user: USER, params }));
    assert.equal(res.status, 403);
    assert.equal((await res.json()).code, 'pro_required');
  }
  assert.equal(sql.calls.length, 0);
});

test('target tabungan: pengguna Pro dan admin bisa membuat target', async () => {
  for (const user of [PRO, ADMIN]) {
    const sql = fakeSql((t) => (t.includes('count(*)') ? [{ n: 0 }] : t.startsWith('insert into kt_goals') ? [GOAL] : []));
    const res = await call(goalsRoute.onRequestPost, makeCtx(makeRequest('POST', '/api/goals', { body: { name: 'Laptop', targetAmount: 6000000 } }), { sql, user }));
    assert.equal(res.status, 201);
    assert.ok(sql.calls.some((c) => c.values.includes(user.id)), 'dibatasi user_id');
  }
});

test('setoran target: tarik melebihi saldo -> 400, setor -> 200, target asing -> 404', async () => {
  const dep = (amount, sql) => call(depositRoute.onRequestPost, makeCtx(makeRequest('POST', `/api/goals/${GOAL_ID}/deposit`, { body: { amount } }), { sql, user: PRO, params: { id: GOAL_ID } }));
  const base = (t) => (t.startsWith('select saved_amount') ? [{ saved: 500000 }] : t.startsWith('update kt_goals') ? [{ ...GOAL, savedAmount: 700000 }] : []);
  assert.equal((await dep(-600000, fakeSql(base))).status, 400);
  const ok = await dep(200000, fakeSql(base));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).goal.savedAmount, 700000);
  assert.equal((await dep(100, fakeSql(() => []))).status, 404);
});

test('bootstrap: target hanya dikirim untuk pengguna Pro', async () => {
  const rows = (t) => (t.includes('from kt_goals') ? [GOAL] : []);
  const run = async (user) => (await bootstrap.onRequestGet({ data: { sql: fakeSql(rows), user } })).json();
  assert.deepEqual((await run(USER)).goals, []);
  assert.equal((await run(PRO)).goals.length, 1);
  const b = await run(ADMIN);
  assert.equal(b.user.role, 'admin');
  assert.equal(b.user.isPro, true);
  assert.equal((await (await me.onRequestGet({ data: { user: PRO } })).json()).user.isPro, true);
});

test('admin: daftar pengguna berisi statistik', async () => {
  const sql = fakeSql((t) => (t.includes('from kt_users u order') ? [{ ...USER, plan: 'pro', proUntil: '2999-01-01T00:00:00Z', txCount: 3 }]
    : t.includes('count(*) filter') ? [{ users: 1, admins: 0, pro: 1, new7: 1, transactions: 3 }] : []));
  const res = await call(adminUsers.onRequestGet, makeCtx(makeRequest('GET', '/api/admin/users'), { sql, user: ADMIN }));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.users[0].isPro, true);
  assert.equal(body.stats.users, 1);
  const denied = await call(adminUsers.onRequestGet, makeCtx(makeRequest('GET', '/api/admin/users'), { sql, user: USER }));
  assert.equal(denied.status, 403);
});

test('admin: ubah role dan paket, dengan perlindungan admin terakhir', async () => {
  const target = { ...USER, id: TARGET_ID, role: 'admin', txCount: 0 };
  const mk = (body, others) => makeCtx(makeRequest('PATCH', `/api/admin/users/${TARGET_ID}`, { body }), {
    user: ADMIN, params: { id: TARGET_ID },
    sql: fakeSql((t) => (t.includes('from kt_users u where') ? [target] : t.includes("role = 'admin' and id <>") ? [{ n: others }] : [])),
  });
  assert.equal((await call(adminUser.onRequestPatch, mk({ role: 'user' }, 0))).status, 400, 'admin terakhir tidak boleh diturunkan');
  assert.equal((await call(adminUser.onRequestPatch, mk({ role: 'user' }, 1))).status, 200);
  assert.equal((await call(adminUser.onRequestPatch, mk({ plan: 'pro', proDays: 30 }, 0))).status, 200);
  assert.equal((await call(adminUser.onRequestPatch, mk({ plan: 'emas' }, 1))).status, 400);

  const sql = fakeSql((t) => (t.includes('from kt_users u where') ? [target] : t.includes("role = 'admin' and id <>") ? [{ n: 1 }] : []));
  await call(adminUser.onRequestPatch, makeCtx(makeRequest('PATCH', `/api/admin/users/${TARGET_ID}`, { body: { plan: 'pro', proDays: 90 } }), { user: ADMIN, params: { id: TARGET_ID }, sql }));
  const upd = sql.calls.find((c) => c.text.includes('make_interval'));
  assert.ok(upd, 'perpanjangan memakai make_interval');
  assert.ok(upd.values.includes(90));
});

test('admin: hapus pengguna — tidak bisa diri sendiri atau admin terakhir', async () => {
  const del = (id, target, others) => call(adminUser.onRequestDelete, makeCtx(makeRequest('DELETE', `/api/admin/users/${id}`), {
    user: ADMIN, params: { id },
    sql: fakeSql((t) => (t.includes('from kt_users u where') ? (target ? [target] : []) : t.includes("role = 'admin' and id <>") ? [{ n: others }] : [])),
  }));
  assert.equal((await del(ADMIN.id, { ...ADMIN }, 1)).status, 400, 'diri sendiri');
  assert.equal((await del(TARGET_ID, null, 1)).status, 404);
  assert.equal((await del(TARGET_ID, { ...USER, id: TARGET_ID, role: 'admin' }, 0)).status, 400, 'admin terakhir');
  assert.equal((await del(TARGET_ID, { ...USER, id: TARGET_ID }, 0)).status, 200);
});

test('admin: reset kata sandi mengembalikan kata sandi sementara satu kali', async () => {
  const sql = fakeSql((t) => (t.includes('from kt_users u where') ? [{ ...USER, id: TARGET_ID }] : t.startsWith('update kt_users set password_hash') ? [{ id: TARGET_ID }] : []));
  const res = await call(adminReset.onRequestPost, makeCtx(makeRequest('POST', `/api/admin/users/${TARGET_ID}/reset-password`, { body: {} }), { user: ADMIN, params: { id: TARGET_ID }, sql, env: { PBKDF2_ITERATIONS: '1000' } }));
  const { temporaryPassword } = await res.json();
  assert.equal(res.status, 200);
  assert.equal(temporaryPassword.length, 10);
  const stored = sql.calls.find((c) => c.text.startsWith('update kt_users set password_hash')).values[0];
  assert.match(stored, /^pbkdf2\$/);
  assert.ok(!stored.includes(temporaryPassword), 'yang tersimpan hanya hash');
  assert.equal((await call(adminReset.onRequestPost, makeCtx(makeRequest('POST', '/x', { body: {} }), { user: USER, params: { id: TARGET_ID } }))).status, 403);
});
