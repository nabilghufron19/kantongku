// Uji asap ke server yang sudah berjalan (lokal atau hasil deploy):
//   BASE_URL=https://kantong.pages.dev SMOKE_USER=ali SMOKE_PASS=sandi-anda npm run smoke
// Membuat satu transaksi uji lalu menghapusnya kembali. Data lain tidak disentuh.
const BASE = (process.env.BASE_URL || 'http://localhost:8788').replace(/\/$/, '');
const USER = process.env.SMOKE_USER, PASS = process.env.SMOKE_PASS;
let cookie = '', failed = 0;

const check = (ok, name, extra = '') => { console.log(`${ok ? 'OK    ' : 'GAGAL '} ${name}${extra ? ' - ' + extra : ''}`); if (!ok) failed++; };

async function call(method, path, body) {
  const res = await fetch(BASE + '/api' + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  let data = null; try { data = await res.json(); } catch { /* kosong */ }
  return { status: res.status, data };
}

const health = await call('GET', '/health');
check(health.status === 200, 'health', JSON.stringify(health.data));
if (health.status !== 200) { console.log('Perbaiki pengaturan di atas dulu (DATABASE_URL, JWT_SECRET, skema).'); process.exit(1); }
if (!USER || !PASS) { console.log('Isi SMOKE_USER dan SMOKE_PASS untuk menguji login dan transaksi.'); process.exit(0); }

let r = await call('POST', '/auth/login', { username: USER, password: PASS });
if (r.status === 401) { const cfg = await call('GET', '/auth/config'); if (cfg.data?.registrationOpen) r = await call('POST', '/auth/register', { username: USER, password: PASS, name: USER }); }
check(r.status === 200 || r.status === 201, 'login/daftar', r.data?.error || '');
if (!cookie) process.exit(1);

const boot = await call('GET', '/bootstrap');
check(boot.status === 200 && boot.data.categories.length > 0, 'bootstrap', `${boot.data?.categories?.length} kategori`);
const cat = boot.data.categories.find((c) => c.type === 'out');

const today = new Date().toISOString().slice(0, 10);
const made = await call('POST', '/transactions', { type: 'out', amount: 1234, date: today, categoryId: cat.id, note: 'uji asap' });
check(made.status === 201, 'buat transaksi', made.data?.error || '');
const id = made.data?.transaction?.id;
const upd = await call('PUT', `/transactions/${id}`, { type: 'out', amount: 4321, date: today, categoryId: cat.id, note: 'uji asap (ubah)' });
check(upd.status === 200 && upd.data.transaction.amount === 4321, 'ubah transaksi', upd.data?.error || '');
const wrong = await call('POST', '/transactions', { type: 'in', amount: 1, date: today, categoryId: cat.id });
check(wrong.status === 400, 'jenis tidak cocok dengan kategori ditolak');
const del = await call('DELETE', `/transactions/${id}`);
check(del.status === 200, 'hapus transaksi');
const anon = await fetch(BASE + '/api/bootstrap');
check(anon.status === 401, 'tanpa login ditolak (401)');

console.log(failed ? `\n${failed} pemeriksaan gagal.` : '\nSemua pemeriksaan lolos.');
process.exit(failed ? 1 : 0);
