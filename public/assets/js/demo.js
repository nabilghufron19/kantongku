// Mode demo: data contoh pemakaian satu bulan + "server" mini di dalam browser.
// Tidak ada yang dikirim atau disimpan ke server; semua hilang saat halaman ditutup.
import { ApiError } from './api.js';
import { pad, todayStr, shiftMonth, thisMonth, daysIn, byNewest } from './util.js';

const CATS = [
  { name: 'Makan & Minum', icon: '🍽️', color: '#E07A3F', type: 'out' },
  { name: 'Transportasi', icon: '🚌', color: '#3F7FE0', type: 'out' },
  { name: 'Belanja', icon: '🛍️', color: '#B04FD0', type: 'out' },
  { name: 'Tagihan & Pulsa', icon: '💡', color: '#D4A82A', type: 'out' },
  { name: 'Kesehatan', icon: '💊', color: '#D2475F', type: 'out' },
  { name: 'Pendidikan', icon: '📚', color: '#2A9D8F', type: 'out' },
  { name: 'Hiburan', icon: '🎮', color: '#6A5ACD', type: 'out' },
  { name: 'Sedekah & Zakat', icon: '🤲', color: '#2E8B57', type: 'out' },
  { name: 'Lainnya', icon: '📦', color: '#7A8590', type: 'out', isFallback: true },
  { name: 'Gaji', icon: '💼', color: '#1F7A4D', type: 'in' },
  { name: 'Kiriman / Uang saku', icon: '🎁', color: '#3AA57A', type: 'in' },
  { name: 'Usaha sampingan', icon: '🏪', color: '#5B9BD5', type: 'in' },
  { name: 'Pemasukan lain', icon: '💰', color: '#8AA04A', type: 'in', isFallback: true },
];

function rng(seed) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const uuid = () => crypto.randomUUID();
const addDays = (dateStr, n) => { const [y, m, d] = dateStr.split('-').map(Number); const dt = new Date(y, m - 1, d + n); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; };

// Satu bulan lebih riwayat: dari tanggal 1 bulan lalu sampai hari ini.
export function buildDemoData() {
  const rnd = rng(42);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const between = (lo, hi, step = 1000) => Math.round((lo + rnd() * (hi - lo)) / step) * step;

  const categories = CATS.map((c, i) => ({ id: uuid(), name: c.name, icon: c.icon, color: c.color, type: c.type, isFallback: Boolean(c.isFallback), position: i + 1 }));
  const cat = (name) => categories.find((c) => c.name === name).id;
  const transactions = [];
  let n = 0;
  const today = todayStr();
  const add = (date, type, name, amount, note, method = 'Tunai') => {
    if (date > today) return;
    transactions.push({ id: uuid(), type, amount, date, categoryId: cat(name), method, note, createdAt: new Date(Date.parse(date + 'T08:00:00') + (n++) * 60000).toISOString() });
  };

  const start = shiftMonth(thisMonth(), -1) + '-01';
  for (let date = start; date <= today; date = addDays(date, 1)) {
    const [y, m, d] = date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay(); // 0 = Minggu
    if (d === 1) add(date, 'in', 'Kiriman / Uang saku', 2500000, 'Kiriman bulanan dari orang tua', 'Transfer Bank');
    if (rnd() < 0.1) add(date, 'in', 'Usaha sampingan', between(150000, 400000, 25000), pick(['Jual pulsa dan paket data', 'Servis laptop teman', 'Desain poster']), 'E-Wallet');

    if (rnd() < 0.75) add(date, 'out', 'Makan & Minum', between(8000, 12000), pick(['Sarapan nasi kuning', 'Sarapan bubur ayam', 'Gorengan dan teh']));
    if (rnd() < 0.92) add(date, 'out', 'Makan & Minum', between(14000, 26000), pick(['Makan siang warteg', 'Nasi padang', 'Mie ayam', 'Soto ayam']));
    if (rnd() < 0.8) add(date, 'out', 'Makan & Minum', between(12000, 22000), pick(['Makan malam', 'Nasi goreng', 'Pecel lele']));
    if (rnd() < 0.45) add(date, 'out', 'Makan & Minum', between(5000, 14000), pick(['Es teh dan gorengan', 'Kopi', 'Jajan']));

    if (dow === 0) add(date, 'out', 'Transportasi', between(20000, 40000), 'Bensin motor');
    else if (rnd() < 0.2) add(date, 'out', 'Transportasi', between(8000, 28000), pick(['Ojek online', 'Angkot', 'Parkir']), pick(['Tunai', 'E-Wallet']));
    if (dow === 5) add(date, 'out', 'Sedekah & Zakat', between(5000, 10000), 'Infak Jumat');
    if (dow === 6 && rnd() < 0.55) add(date, 'out', 'Hiburan', between(25000, 60000, 5000), pick(['Nonton bareng teman', 'Top up game', 'Main futsal']), pick(['Tunai', 'E-Wallet']));
    if (d === 5) add(date, 'out', 'Tagihan & Pulsa', 75000, 'Paket data bulanan', 'E-Wallet');
    if (d === 12) add(date, 'out', 'Tagihan & Pulsa', 60000, 'Iuran WiFi kos', 'Transfer Bank');
    if (d === 10) add(date, 'out', 'Pendidikan', between(40000, 90000, 5000), 'Fotokopi dan buku');
    else if (rnd() < 0.06) add(date, 'out', 'Pendidikan', between(15000, 50000, 5000), 'Alat tulis');
    if (rnd() < 0.07) add(date, 'out', 'Belanja', between(20000, 70000, 5000), pick(['Sabun dan perlengkapan mandi', 'Deterjen', 'Kaos kaki']));
    if (rnd() < 0.03) add(date, 'out', 'Kesehatan', between(15000, 45000, 5000), 'Obat flu');
  }
  add(addDays(today, -9), 'out', 'Belanja', 185000, 'Sepatu', 'Transfer Bank');
  transactions.sort(byNewest);

  const budgetOf = { 'Makan & Minum': 1300000, Transportasi: 250000, Belanja: 300000, 'Tagihan & Pulsa': 200000, Kesehatan: 150000, Pendidikan: 200000, Hiburan: 150000, 'Sedekah & Zakat': 100000 };
  const budgets = Object.entries(budgetOf).map(([name, amount]) => ({ categoryId: cat(name), amount }));

  const goals = [
    { id: uuid(), name: 'Laptop kuliah', icon: '💻', color: '#2E3FA3', targetAmount: 6000000, savedAmount: 2350000, deadline: addDays(today, 150), createdAt: new Date().toISOString() },
    { id: uuid(), name: 'Dana darurat', icon: '🛟', color: '#2A9D8F', targetAmount: 3000000, savedAmount: 1200000, deadline: null, createdAt: new Date().toISOString() },
    { id: uuid(), name: 'Kursus bahasa Inggris', icon: '📘', color: '#B04FD0', targetAmount: 1200000, savedAmount: 1200000, deadline: addDays(today, -10), createdAt: new Date().toISOString() },
  ];
  return { categories, transactions, budgets, goals };
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const deny = () => new ApiError(403, 'Tidak tersedia di mode demo. Daftar akun gratis untuk memakai fitur ini.');
const bad = (message, field) => new ApiError(400, message, field);

export const DEMO_USER = { id: 'demo', username: 'demo', name: 'Akun Demo', role: 'user', plan: 'pro', proUntil: null, isPro: true, demo: true };

export function createDemoHandler() {
  const d = buildDemoData();
  let cats = d.categories, tx = d.transactions, goals = d.goals;
  const budgets = new Map(d.budgets.map((b) => [b.categoryId, b.amount]));

  const txInput = (b) => {
    const amount = Number(b.amount);
    if (!Number.isInteger(amount) || amount <= 0) throw bad('Jumlah harus bilangan bulat lebih dari nol.', 'amount');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) throw bad('Tanggal harus berformat YYYY-MM-DD.', 'date');
    if (b.type !== 'in' && b.type !== 'out') throw bad('Jenis tidak valid.', 'type');
    if (!cats.some((c) => c.id === b.categoryId && c.type === b.type)) throw bad('Kategori tidak ditemukan atau jenisnya tidak cocok.', 'categoryId');
    return { type: b.type, amount, date: b.date, categoryId: b.categoryId, method: String(b.method || 'Tunai').slice(0, 30), note: String(b.note || '').slice(0, 120) };
  };
  const goalInput = (b) => {
    const target = Number(b.targetAmount);
    if (!String(b.name || '').trim()) throw bad('Kolom ini wajib diisi.', 'name');
    if (!Number.isInteger(target) || target <= 0) throw bad('Jumlah harus bilangan bulat lebih dari nol.', 'targetAmount');
    return { name: String(b.name).trim().slice(0, 40), icon: String(b.icon || '🎯').slice(0, 8), color: b.color || '#2E3FA3', targetAmount: target, deadline: b.deadline || null };
  };

  return async function handle(method, path, body) {
    let m;
    if (method === 'GET' && path === '/bootstrap') {
      return clone({ user: DEMO_USER, categories: cats, transactions: [...tx].sort(byNewest), budgets: [...budgets].map(([categoryId, amount]) => ({ categoryId, amount })), goals, truncated: false });
    }
    if (method === 'GET' && path === '/auth/me') return { user: { ...DEMO_USER } };
    if (method === 'POST' && path === '/auth/logout') return { ok: true };
    if (method === 'GET' && path === '/data/export') {
      return clone({ app: 'kantong', version: 2, categories: cats, transactions: tx.map(({ createdAt, ...t }) => t), budgets: [...budgets].map(([categoryId, amount]) => ({ categoryId, amount })) });
    }

    if (method === 'POST' && path === '/transactions') {
      const row = { id: body.id || uuid(), ...txInput(body), createdAt: new Date().toISOString() };
      if (tx.some((t) => t.id === row.id)) throw new ApiError(409, 'Transaksi dengan ID ini sudah ada.');
      tx.push(row); return clone({ transaction: row });
    }
    if ((m = /^\/transactions\/([^/]+)$/.exec(path))) {
      const i = tx.findIndex((t) => t.id === m[1]);
      if (i < 0) throw new ApiError(404, 'Transaksi tidak ditemukan.');
      if (method === 'DELETE') { tx.splice(i, 1); return { ok: true }; }
      if (method === 'PUT') { Object.assign(tx[i], txInput(body)); return clone({ transaction: tx[i] }); }
    }

    if (method === 'POST' && path === '/categories') {
      const name = String(body.name || '').trim();
      if (!name) throw bad('Kolom ini wajib diisi.', 'name');
      if (cats.some((c) => c.type === body.type && c.name.toLowerCase() === name.toLowerCase())) throw new ApiError(409, 'Nama kategori sudah dipakai.', 'name');
      const c = { id: uuid(), name: name.slice(0, 40), icon: String(body.icon || '📦').slice(0, 8), color: body.color || '#7A8590', type: body.type === 'in' ? 'in' : 'out', isFallback: false, position: cats.length + 1 };
      cats.push(c); return clone({ category: c });
    }
    if ((m = /^\/categories\/([^/]+)$/.exec(path))) {
      const c = cats.find((x) => x.id === m[1]);
      if (!c) throw new ApiError(404, 'Kategori tidak ditemukan.');
      if (method === 'PUT') { Object.assign(c, { name: String(body.name || c.name).slice(0, 40), icon: body.icon || c.icon, color: body.color || c.color }); return clone({ category: c }); }
      if (method === 'DELETE') {
        if (c.isFallback) throw bad('Kategori bawaan tidak bisa dihapus.');
        const fb = cats.find((x) => x.type === c.type && x.isFallback);
        let moved = 0; tx.forEach((t) => { if (t.categoryId === c.id) { t.categoryId = fb.id; moved++; } });
        budgets.delete(c.id); cats = cats.filter((x) => x !== c);
        return { ok: true, moved, movedTo: fb.id };
      }
    }

    if (method === 'PUT' && path === '/budgets') { budgets.clear(); for (const [k, v] of Object.entries(body.budgets || {})) budgets.set(k, Number(v)); return { budgets: [] }; }
    if ((m = /^\/budgets\/([^/]+)$/.exec(path)) && method === 'PUT') {
      const a = Number(body.amount) || 0; if (a > 0) budgets.set(m[1], a); else budgets.delete(m[1]);
      return { budget: { categoryId: m[1], amount: a } };
    }

    if (method === 'POST' && path === '/goals') { const g = { id: uuid(), ...goalInput(body), savedAmount: 0, createdAt: new Date().toISOString() }; goals.push(g); return clone({ goal: g }); }
    if ((m = /^\/goals\/([^/]+)\/deposit$/.exec(path)) && method === 'POST') {
      const g = goals.find((x) => x.id === m[1]); if (!g) throw new ApiError(404, 'Target tidak ditemukan.');
      const a = Number(body.amount);
      if (!Number.isInteger(a) || a === 0) throw bad('Jumlah harus bilangan bulat dan bukan nol.', 'amount');
      if (g.savedAmount + a < 0) throw bad('Jumlah penarikan melebihi dana yang sudah terkumpul.', 'amount');
      g.savedAmount += a; return clone({ goal: g });
    }
    if ((m = /^\/goals\/([^/]+)$/.exec(path))) {
      const g = goals.find((x) => x.id === m[1]); if (!g) throw new ApiError(404, 'Target tidak ditemukan.');
      if (method === 'PUT') { Object.assign(g, goalInput(body)); return clone({ goal: g }); }
      if (method === 'DELETE') { goals = goals.filter((x) => x !== g); return { ok: true }; }
    }
    throw deny();
  };
}

export { daysIn };
