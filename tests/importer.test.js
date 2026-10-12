import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImport, buildImportPlan } from '../src/server/importer.js';
import { HttpError } from '../src/server/http.js';

const counter = () => { let n = 0; return () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`; };

// Bentuk cadangan lama dari versi index.html tunggal (localStorage).
const v1 = {
  cats: [
    { id: 'makan', name: 'Makan & Minum', icon: '🍽️', color: '#E07A3F', type: 'out' },
    { id: 'lainnya-out', name: 'Lainnya', icon: '📦', color: '#7A8590', type: 'out' },
    { id: 'kiriman', name: 'Kiriman / Uang saku', icon: '🎁', color: '#3AA57A', type: 'in' },
  ],
  tx: [
    { id: 'abc', type: 'out', amount: 15000, date: '2026-10-01', cat: 'makan', method: 'Tunai', note: 'bakso' },
    { id: 'def', type: 'in', amount: 500000, date: '2026-10-02', cat: 'kiriman' },
    { id: 'ghi', type: 'out', amount: 0, date: '2026-10-02', cat: 'makan' },
    { id: 'jkl', type: 'out', amount: 9000, date: '2026-02-31', cat: 'makan' },
    { id: 'mno', type: 'out', amount: 7000, date: '2026-10-03', cat: 'hilang' },
  ],
  budgets: { makan: 600000, kiriman: 1 },
};

test('normalisasi cadangan v1: baris rusak dilewati dan dihitung', () => {
  const n = normalizeImport(v1);
  assert.equal(n.categories.length, 3);
  assert.equal(n.transactions.length, 3);
  assert.equal(n.skipped, 2 + 0);
  assert.equal(n.transactions[0].id, null, 'id non-UUID diganti saat impor');
  assert.equal(n.budgets.length, 2);
});

test('mode replace: kategori dibuat, transaksi dipetakan lewat nama', () => {
  const plan = buildImportPlan(normalizeImport(v1), null, 'replace', counter());
  assert.equal(plan.replace, true);
  const makan = plan.categories.find((c) => c.name === 'Makan & Minum');
  const lainnya = plan.categories.find((c) => c.name === 'Lainnya');
  assert.equal(lainnya.isFallback, true, '"Lainnya" dipakai sebagai penampung');
  const inFallback = plan.categories.find((c) => c.type === 'in' && c.isFallback);
  assert.ok(inFallback, 'penampung pemasukan dibuat otomatis');
  assert.equal(plan.transactions[0].categoryId, makan.id);
  assert.equal(plan.transactions[2].categoryId, lainnya.id, 'kategori hilang -> penampung');
  assert.deepEqual(plan.budgets, [{ categoryId: makan.id, amount: 600000 }], 'anggaran hanya untuk pengeluaran');
  assert.equal(new Set(plan.transactions.map((t) => t.id)).size, plan.transactions.length);
});

test('mode merge: memakai kategori yang sudah ada dan tidak menduplikasi', () => {
  const existing = {
    categories: [
      { id: 'E1', name: 'makan & minum', type: 'out', isFallback: false },
      { id: 'E2', name: 'Lainnya', type: 'out', isFallback: true },
      { id: 'E3', name: 'Pemasukan lain', type: 'in', isFallback: true },
    ],
    maxPosition: 13,
  };
  const plan = buildImportPlan(normalizeImport(v1), existing, 'merge', counter());
  assert.equal(plan.replace, false);
  assert.deepEqual(plan.categories.map((c) => c.name), ['Kiriman / Uang saku']);
  assert.equal(plan.categories[0].position, 14);
  assert.equal(plan.categories[0].isFallback, false);
  assert.equal(plan.transactions[0].categoryId, 'E1');
  assert.equal(plan.transactions[2].categoryId, 'E2');
});

test('jenis transaksi yang tidak cocok dengan kategorinya dialihkan ke penampung', () => {
  const data = normalizeImport({
    categories: [{ id: 'k1', name: 'Gaji', type: 'in' }],
    transactions: [{ type: 'out', amount: 100, date: '2026-01-05', categoryId: 'k1' }],
  });
  const plan = buildImportPlan(data, null, 'replace', counter());
  const fb = plan.categories.find((c) => c.type === 'out' && c.isFallback);
  assert.equal(plan.transactions[0].categoryId, fb.id);
});

test('format tak dikenal ditolak', () => {
  assert.throws(() => normalizeImport(null), HttpError);
  assert.throws(() => normalizeImport({ categories: [] }), (e) => e.status === 400);
  assert.throws(() => normalizeImport({ tx: new Array(20001).fill({}) }), (e) => e.status === 413);
});
