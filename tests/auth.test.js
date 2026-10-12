import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signToken, verifyToken, DUMMY_HASH } from '../src/server/auth.js';

test('hash kata sandi: benar, salah, dan unik per pemanggilan', async () => {
  const a = await hashPassword('kata-sandi-ku', 1000);
  const b = await hashPassword('kata-sandi-ku', 1000);
  assert.notEqual(a, b, 'salt harus acak');
  assert.match(a, /^pbkdf2\$sha256\$1000\$[\w-]{22}\$[\w-]{43}$/);
  assert.equal(await verifyPassword('kata-sandi-ku', a), true);
  assert.equal(await verifyPassword('salah', a), false);
});

test('verifikasi menolak hash rusak tanpa melempar error', async () => {
  assert.equal(await verifyPassword('x', 'bukan-hash'), false);
  assert.equal(await verifyPassword('x', 'bcrypt$sha256$1$a$b'), false);
  assert.equal(await verifyPassword('x', DUMMY_HASH), false);
});

test('token: tanda tangan, kedaluwarsa, dan manipulasi', async () => {
  const secret = 'rahasia-uji-yang-cukup-panjang';
  const exp = Math.floor(Date.now() / 1000) + 60;
  const token = await signToken({ sub: 'abc', tv: 0, exp }, secret);
  assert.deepEqual(await verifyToken(token, secret), { sub: 'abc', tv: 0, exp });
  assert.equal(await verifyToken(token, 'rahasia-lain-yang-panjang!!'), null);

  const [h, p, s] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'admin', tv: 0, exp })).toString('base64url');
  assert.equal(await verifyToken(`${h}.${forged}.${s}`, secret), null);

  const expired = await signToken({ sub: 'abc', tv: 0, exp: Math.floor(Date.now() / 1000) - 1 }, secret);
  assert.equal(await verifyToken(expired, secret), null);

  const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${p}.`;
  assert.equal(await verifyToken(none, secret), null);
  assert.equal(await verifyToken('sampah', secret), null);
});
