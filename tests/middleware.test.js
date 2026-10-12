import test from 'node:test';
import assert from 'node:assert/strict';
import { guard } from '../functions/api/_middleware.js';
import { signToken } from '../src/server/auth.js';
import { fakeSql, makeRequest, USER } from './helpers.js';

const SECRET = 'rahasia-uji-yang-cukup-panjang';
const ok = () => new Response('lolos', { status: 200 });
const run = (request, sql) => guard({ request, env: { JWT_SECRET: SECRET }, data: { sql }, next: ok });

const sessionCookie = async (tv = 0) =>
  `kantong_session=${await signToken({ sub: USER.id, tv, exp: Math.floor(Date.now() / 1000) + 600 }, SECRET)}`;
const userSql = () => fakeSql((text) => (text.includes('from kt_users') ? [{ ...USER }] : []));

test('endpoint privat tanpa cookie -> 401', async () => {
  const res = await run(makeRequest('GET', '/api/bootstrap'), userSql());
  assert.equal(res.status, 401);
  assert.match((await res.json()).error, /masuk/i);
});

test('endpoint publik tidak butuh login', async () => {
  for (const p of ['/api/auth/login', '/api/auth/config', '/api/auth/register']) {
    const res = await run(makeRequest('GET', p), userSql());
    assert.equal(res.status, 200, p);
  }
});

test('cookie sah -> lolos dan data.user terisi', async () => {
  const ctx = { request: makeRequest('GET', '/api/bootstrap', { cookie: await sessionCookie() }), env: { JWT_SECRET: SECRET }, data: { sql: userSql() }, next: ok };
  const res = await guard(ctx);
  assert.equal(res.status, 200);
  assert.equal(ctx.data.user.username, 'ali');
});

test('token_version berubah (ganti sandi) -> sesi lama ditolak', async () => {
  const res = await run(makeRequest('GET', '/api/bootstrap', { cookie: await sessionCookie(3) }), userSql());
  assert.equal(res.status, 401);
});

test('cookie dipalsukan -> 401', async () => {
  const res = await run(makeRequest('GET', '/api/bootstrap', { cookie: 'kantong_session=a.b.c' }), userSql());
  assert.equal(res.status, 401);
});

test('CSRF: Origin asing pada metode penulis ditolak, GET tetap boleh', async () => {
  const cookie = await sessionCookie();
  const bad = await run(makeRequest('POST', '/api/transactions', { body: {}, cookie, headers: { origin: 'https://jahat.example' } }), userSql());
  assert.equal(bad.status, 403);
  const same = await run(makeRequest('POST', '/api/transactions', { body: {}, cookie, headers: { origin: 'https://kantong.example' } }), userSql());
  assert.equal(same.status, 200);
  const get = await run(makeRequest('GET', '/api/bootstrap', { cookie, headers: { origin: 'https://jahat.example' } }), userSql());
  assert.equal(get.status, 200);
});

test('health tidak gagal walau DATABASE_URL belum ada', async () => {
  const res = await guard({ request: makeRequest('GET', '/api/health'), env: {}, data: {}, next: ok });
  assert.equal(res.status, 200);
});

test('DATABASE_URL kosong memberi pesan jelas', async () => {
  const res = await guard({ request: makeRequest('GET', '/api/bootstrap'), env: { JWT_SECRET: SECRET }, data: {}, next: ok });
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /DATABASE_URL/);
});
