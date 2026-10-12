import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAmount, parseDate, parseUsername, parsePassword, parseColor, cleanText,
  parseTransactionInput, parseBudgetAmount, isUuid,
} from '../src/server/validate.js';
import { HttpError } from '../src/server/http.js';
import { CAT_ID } from './helpers.js';

const throwsField = (fn, field) =>
  assert.throws(fn, (e) => e instanceof HttpError && e.status === 400 && (field === undefined || e.field === field));

test('jumlah: hanya bilangan bulat positif', () => {
  assert.equal(parseAmount(35000), 35000);
  assert.equal(parseAmount('35000'), 35000);
  throwsField(() => parseAmount(0), 'amount');
  throwsField(() => parseAmount(-5), 'amount');
  throwsField(() => parseAmount(12.5), 'amount');
  throwsField(() => parseAmount('1e3'), 'amount');
  throwsField(() => parseAmount(1e15), 'amount');
  assert.equal(parseBudgetAmount(0), 0);
});

test('tanggal: harus tanggal kalender nyata', () => {
  assert.equal(parseDate('2026-02-28'), '2026-02-28');
  assert.equal(parseDate('2028-02-29'), '2028-02-29');
  throwsField(() => parseDate('2026-02-30'), 'date');
  throwsField(() => parseDate('2026-13-01'), 'date');
  throwsField(() => parseDate('26-1-1'), 'date');
  throwsField(() => parseDate('1999-12-31'), 'date');
  throwsField(() => parseDate(20260101), 'date');
});

test('nama pengguna dan kata sandi', () => {
  assert.equal(parseUsername('  Ali_99 '), 'ali_99');
  throwsField(() => parseUsername('ab'), 'username');
  throwsField(() => parseUsername('ali budi'), 'username');
  throwsField(() => parseUsername('ali@mail'), 'username');
  assert.equal(parsePassword('12345678'), '12345678');
  throwsField(() => parsePassword('1234567'), 'password');
  throwsField(() => parsePassword(12345678), 'password');
});

test('teks dibersihkan dan dibatasi', () => {
  assert.equal(cleanText('  halo   dunia\n', 20, 'note'), 'halo dunia');
  throwsField(() => cleanText('x'.repeat(121), 120, 'note'), 'note');
  throwsField(() => cleanText('  ', 10, 'name', { required: true }), 'name');
  assert.equal(cleanText(undefined, 10, 'note'), '');
});

test('warna harus #RRGGBB', () => {
  assert.equal(parseColor('#aabbcc'), '#AABBCC');
  throwsField(() => parseColor('red'), 'color');
  throwsField(() => parseColor('#abc'), 'color');
});

test('transaksi: input lengkap dirapikan', () => {
  const t = parseTransactionInput({ type: 'out', amount: '15000', date: '2026-10-11', categoryId: CAT_ID.toUpperCase(), note: ' bakso ' });
  assert.deepEqual(t, { type: 'out', amount: 15000, date: '2026-10-11', categoryId: CAT_ID, method: 'Tunai', note: 'bakso' });
  throwsField(() => parseTransactionInput({ type: 'x', amount: 1, date: '2026-10-11', categoryId: CAT_ID }), 'type');
  throwsField(() => parseTransactionInput({ type: 'in', amount: 1, date: '2026-10-11', categoryId: 'bukan-uuid' }), 'categoryId');
  assert.equal(isUuid(CAT_ID), true);
});
