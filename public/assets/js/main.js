// Titik masuk: routing, tema, dan pengelola aksi.
import { onUnauthorized } from './api.js';
import {
  state, boot, resetState, removeCat, setBudget, exportData, importData, clearData, logout, deleteAccount,
  renameUser, removeGoal, refreshMe, isPro, isAdmin, isDemo,
} from './store.js';
import { view, setRenderer, rerender } from './view.js';
import { $, $$, esc, ic, TABS, thisMonth, shiftMonth, parseAmt, fmtInput, download, todayStr } from './util.js';
import { toast, confirmDialog, setMode, showFatal } from './ui.js';
import { initDialogs, openTx, openCat, openPass, deleteTx, openGoal, openDeposit, openUpgrade } from './dialogs.js';
import { vDashboard } from './views/dashboard.js';
import { vTx, updateTxList } from './views/transactions.js';
import { vBudget, budgetStat, budgetTotals, autoBudget, clearBudgets } from './views/budgets.js';
import { vReport } from './views/report.js';
import { vSettings, exportCSV } from './views/settings.js';
import { vAdmin, admin, loadAdmin, updateAdminList, openUserDlg, initAdmin } from './views/admin.js';
import { showAuth } from './views/auth.js';

view.rm = 6; // periode Laporan (bulan)

/* ---------- tema (disimpan di peramban) ---------- */
const THEME_KEY = 'kantong:theme';
const getTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } };
const setTheme = (t) => { try { localStorage.setItem(THEME_KEY, t); } catch { /* diabaikan */ } };
function applyTheme() {
  const t = getTheme();
  document.documentElement.dataset.theme = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
}

/* ---------- render ---------- */
const visibleTabs = () => TABS.filter((t) => !t.admin || isAdmin());
const planName = () => (isDemo() ? 'Demo' : isAdmin() ? 'Admin' : isPro() ? 'Pro' : 'Gratis');

function renderNav() {
  $('#nav').innerHTML = visibleTabs().map((t) => `<a href="#/${t.id}" class="${view.tab === t.id ? 'on' : ''}" ${view.tab === t.id ? 'aria-current="page"' : ''}>${ic(t.icon)}<span class="l-full">${t.label}</span><span class="l-short">${t.short}</span>${t.pro && !isPro() ? '<span class="pro-chip">PRO</span>' : ''}</a>`).join('');
}
function renderUser() {
  if (!state.user) return;
  $('#userChip').innerHTML = `<div class="av" aria-hidden="true">${esc((state.user.name || state.user.username).slice(0, 1).toUpperCase())}</div>
    <div class="who"><b>${esc(state.user.name)}</b><span>@${esc(state.user.username)} <em class="tag ${isPro() ? 'pro' : ''}">${planName()}</em></span></div>
    <button class="btn ghost sm" data-action="logout">Keluar</button>`;
}
const demoBar = () => (isDemo()
  ? `<div class="demo-bar"><span>🧪 <b>Mode demo</b>: data contoh pemakaian sebulan. Perubahan tidak disimpan.</span><button class="btn sm primary" data-action="demo-signup">Daftar gratis</button><button class="btn sm" data-action="logout">Keluar dari demo</button></div>` : '');

function render() {
  if (!state.user) return;
  if (view.tab === 'admin' && !isAdmin()) view.tab = 'ringkasan';
  applyTheme(); renderNav(); renderUser();
  const body = {
    ringkasan: vDashboard, transaksi: vTx, anggaran: vBudget, laporan: vReport, admin: vAdmin,
    pengaturan: () => vSettings(getTheme()),
  }[view.tab] || vDashboard;
  $('#view').innerHTML = demoBar() + body();
  if (view.tab === 'transaksi') updateTxList();
  if (view.tab === 'admin') updateAdminList();
}
setRenderer(render);

function route() {
  if (!state.user) return;
  const h = location.hash.replace(/^#\/?/, '');
  view.tab = visibleTabs().some((t) => t.id === h) ? h : 'ringkasan';
  render(); window.scrollTo(0, 0);
  if (view.tab === 'admin') loadAdmin();
}

/* ---------- alur masuk ---------- */
let authing = false;
async function authFlow(notice = '', opts = {}) {
  if (authing) return;
  authing = true;
  try {
    $$('dialog[open]').forEach((d) => d.close());
    await showAuth(notice, opts);
  } finally { authing = false; }
  enterApp();
}
function enterApp() {
  // di demo, awal bulan memulai dari bulan lalu supaya grafik langsung terisi
  view.month = isDemo() && +todayStr().slice(8) <= 7 ? shiftMonth(thisMonth(), -1) : thisMonth();
  setMode('app'); route();
}
onUnauthorized(() => { resetState(); authFlow('Sesi Anda sudah berakhir. Silakan masuk lagi.'); });

async function start() {
  setMode('loading');
  try { await boot(); enterApp(); }
  catch (e) { if (e.status !== 401) showFatal(e, start); }
}

/* ---------- aksi ---------- */
async function run(fn) {
  try { await fn(); } catch (e) {
    if (e.code === 'pro_required') openUpgrade(); else toast(e.message || 'Terjadi kesalahan.');
  }
}
// true = pengguna gratis, dialog upgrade sudah dibuka
const needPro = (feature) => { if (isPro()) return false; openUpgrade(feature); return true; };
let importMode = 'merge';

document.addEventListener('click', (e) => {
  // ketuk baris transaksi (di bagian yang bukan tombol) untuk mengubahnya
  const rowEl = e.target.closest('[data-txid]');
  if (rowEl && !e.target.closest('button, a, input, select') && !rowEl.closest('dialog')) { openTx(rowEl.dataset.txid); return; }
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('dialog')) return;
  const id = el.dataset.id;
  switch (el.dataset.action) {
    case 'add': openTx(); break;
    case 'edit': openTx(id); break;
    case 'del': deleteTx(id); break;
    case 'prev': view.month = shiftMonth(view.month, -1); rerender(); break;
    case 'next': view.month = shiftMonth(view.month, 1); rerender(); break;
    case 'today': view.month = thisMonth(); rerender(); break;
    case 'autobudget': if (!needPro('Anggaran Otomatis')) run(autoBudget); break;
    case 'clearbudget': run(clearBudgets); break;
    case 'cat-add': openCat(); break;
    case 'cat-edit': openCat(id); break;
    case 'cat-del': run(async () => {
      const c = state.cats.find((x) => x.id === id); if (!c) return;
      const used = state.tx.filter((t) => t.categoryId === id).length;
      const ok = await confirmDialog({ title: `Hapus kategori "${c.name}"?`, message: used ? `${used} transaksi akan dipindahkan ke kategori bawaan.` : 'Kategori ini belum dipakai transaksi.', okLabel: 'Hapus', danger: true });
      if (!ok) return;
      await removeCat(id); rerender(); toast('Kategori dihapus.');
    }); break;
    case 'export-json': run(async () => {
      download(`kantong-cadangan-${todayStr()}.json`, JSON.stringify(await exportData(), null, 2), 'application/json');
      toast('Cadangan diunduh.');
    }); break;
    case 'export-csv': if (!needPro('Ekspor Excel (CSV)')) exportCSV(); break;
    case 'import-merge': importMode = 'merge'; $('#importFile').click(); break;
    case 'import-replace': importMode = 'replace'; $('#importFile').click(); break;
    case 'clear-data': run(async () => {
      const ok = await confirmDialog({ title: 'Hapus semua transaksi?', message: 'Semua transaksi dan anggaran akan dihapus permanen. Kategori tetap ada. Unduh cadangan dulu jika perlu.', okLabel: 'Hapus semua', danger: true });
      if (!ok) return;
      await clearData(); rerender(); toast('Semua transaksi dan anggaran dihapus.');
    }); break;
    case 'delete-account': run(async () => {
      const ok = await confirmDialog({ title: 'Hapus akun?', message: 'Akun dan seluruh datanya dihapus permanen dari server. Masukkan kata sandi untuk melanjutkan.', okLabel: 'Hapus akun', danger: true, askPassword: true });
      if (!ok) return;
      await deleteAccount(ok.password);
      authFlow('Akun sudah dihapus.');
    }); break;
    case 'change-password': openPass(); break;
    case 'logout': run(async () => { await logout(); authFlow(); }); break;
    case 'demo-signup': run(async () => { await logout(); authFlow('', { mode: 'register' }); }); break;

    /* fitur Pro */
    case 'upgrade': openUpgrade(el.dataset.feature); break;
    case 'report-range': view.rm = Number(el.dataset.n) || 6; rerender(); break;
    case 'print-report': window.print(); break;
    case 'goal-add': if (!needPro('Target Tabungan')) openGoal(); break;
    case 'goal-edit': openGoal(id); break;
    case 'goal-deposit': openDeposit(id, 'in'); break;
    case 'goal-withdraw': openDeposit(id, 'out'); break;
    case 'goal-del': run(async () => {
      const g = state.goals.find((x) => x.id === id); if (!g) return;
      const ok = await confirmDialog({ title: `Hapus target "${g.name}"?`, message: 'Dana yang tercatat di target ini ikut terhapus dari catatan.', okLabel: 'Hapus', danger: true });
      if (!ok) return;
      await removeGoal(id); rerender(); toast('Target dihapus.');
    }); break;

    /* admin */
    case 'admin-manage': openUserDlg(id); break;
    case 'admin-refresh': loadAdmin(); break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'q') { view.q = t.value; updateTxList(); }
  else if (t.id === 'aq') { admin.q = t.value; updateAdminList(); }
  else if (t.dataset && t.dataset.budget) t.value = fmtInput(t.value);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'fType') { view.type = t.value; updateTxList(); }
  else if (t.id === 'fCatF') { view.cat = t.value; updateTxList(); }
  else if (t.id === 'fSort') { view.sort = t.value; updateTxList(); }
  else if (t.id === 'fAll') { view.all = t.checked; rerender(); }
  else if (t.id === 'theme') { setTheme(t.value); applyTheme(); }
  else if (t.dataset && t.dataset.budget) {
    const catId = t.dataset.budget, n = parseAmt(t.value);
    run(async () => {
      try { await setBudget(catId, n); } catch (err) { rerender(); throw err; }
      const b = $(`[data-bstat="${CSS.escape(catId)}"]`); if (b) b.innerHTML = budgetStat(catId);
      const s = $('#bsum'); if (s) s.innerHTML = budgetTotals();
    });
  }
  else if (t.id === 'importFile' && t.files[0]) {
    const file = t.files[0]; t.value = '';
    run(async () => {
      let data;
      try { data = JSON.parse(await file.text()); } catch { throw new Error('File bukan JSON yang valid. Pilih file cadangan dari Kantong.'); }
      const replace = importMode === 'replace';
      const ok = await confirmDialog({
        title: replace ? 'Ganti semua data?' : 'Gabungkan cadangan?',
        message: replace ? 'Semua transaksi, kategori, dan anggaran saat ini akan diganti isi file ini.' : 'Isi file ditambahkan ke data saat ini. Transaksi yang sudah ada tidak digandakan.',
        okLabel: replace ? 'Ganti semua' : 'Gabungkan', danger: replace,
      });
      if (!ok) return;
      const r = await importData(data, importMode);
      rerender();
      toast(`Impor selesai: ${r.imported.transactions} transaksi${r.skipped ? `, ${r.skipped} baris dilewati` : ''}.`);
    });
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'nameForm') return;
  e.preventDefault();
  const name = e.target.elements.name.value.trim();
  if (!name) return toast('Nama tampilan tidak boleh kosong.');
  run(async () => { await renameUser(name); rerender(); toast('Nama diperbarui.'); });
});

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && state.user
    && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
    e.preventDefault(); openTx();
  }
});

// Saat tab kembali aktif, segarkan role/paket (mis. setelah admin mengaktifkan Pro).
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !state.user || isDemo()) return;
  try {
    if (await refreshMe()) { rerender(); toast(`Akun Anda diperbarui. Paket sekarang: ${planName()}.`); }
  } catch { /* offline: abaikan */ }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (getTheme() === 'auto') applyTheme(); });
matchMedia('(max-width: 820px)').addEventListener?.('change', () => { if (state.user) render(); });
window.addEventListener('hashchange', route);
initDialogs(); initAdmin();
applyTheme();
start();
