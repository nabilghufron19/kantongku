// Panel admin: daftar pengguna, role, paket Pro, reset kata sandi, hapus pengguna.
import { api } from '../api.js';
import { state, isAdmin, refreshMe } from '../store.js';
import { rerender } from '../view.js';
import { $, esc, fmtDateTime } from '../util.js';
import { toast, confirmDialog, busy } from '../ui.js';

export const admin = { users: [], stats: null, loading: false, error: '', q: '', loaded: false };

export async function loadAdmin({ silent = false } = {}) {
  if (!silent) { admin.loading = true; admin.error = ''; rerender(); }
  try {
    const d = await api.get('/admin/users');
    admin.users = d.users; admin.stats = d.stats; admin.loaded = true; admin.error = '';
  } catch (e) { admin.error = e.message; }
  admin.loading = false;
  rerender();
}

export function planText(u) {
  if (u.role === 'admin') return 'Admin, semua fitur Pro aktif';
  if (u.plan === 'pro') {
    if (!u.proUntil) return 'Pro selamanya';
    return u.isPro ? `Pro sampai ${fmtDateTime(u.proUntil)}` : `Pro berakhir ${fmtDateTime(u.proUntil)} (kembali Gratis)`;
  }
  return 'Gratis';
}
const planBadge = (u) => (u.role === 'admin' ? '' : u.isPro ? '<span class="badge ok">Pro</span>' : u.plan === 'pro' ? '<span class="badge bad">Pro berakhir</span>' : '<span class="badge">Gratis</span>');
const roleBadge = (u) => (u.role === 'admin' ? '<span class="badge gold">Admin</span>' : '<span class="badge">Pengguna</span>');

function userRow(u) {
  const me = state.user && u.id === state.user.id;
  return `<div class="urow">
    <div class="av" aria-hidden="true">${esc((u.name || u.username).slice(0, 1).toUpperCase())}</div>
    <div class="umain">
      <div class="uname"><b>${esc(u.name)}</b> <span class="muted">@${esc(u.username)}${me ? ' (Anda)' : ''}</span></div>
      <div class="ubadges">${roleBadge(u)}${planBadge(u)}</div>
      <div class="umeta">Terdaftar ${fmtDateTime(u.createdAt)}. Terakhir masuk ${fmtDateTime(u.lastLoginAt)}. ${u.txCount} transaksi.</div>
    </div>
    <button class="btn sm" data-action="admin-manage" data-id="${esc(u.id)}">Kelola</button>
  </div>`;
}

export function updateAdminList() {
  const box = $('#adminList'); if (!box) return;
  const q = admin.q.trim().toLowerCase();
  const list = admin.users.filter((u) => !q || u.username.includes(q) || u.name.toLowerCase().includes(q));
  box.innerHTML = list.length ? list.map(userRow).join('') : '<div class="empty">Tidak ada pengguna yang cocok.</div>';
}

export function vAdmin() {
  const s = admin.stats;
  const body = admin.loading && !admin.loaded ? '<div class="empty">Memuat data pengguna...</div>'
    : admin.error ? `<div class="banner bad"><span>${esc(admin.error)}</span><button class="btn sm" data-action="admin-refresh">Coba lagi</button></div>`
    : `<div class="kpis">
        <div class="kpi"><span>Total pengguna</span><b>${s ? s.users : 0}</b></div>
        <div class="kpi"><span>Pro aktif</span><b class="in">${s ? s.pro : 0}</b></div>
        <div class="kpi"><span>Admin</span><b>${s ? s.admins : 0}</b></div>
        <div class="kpi"><span>Baru 7 hari</span><b>${s ? s.new7 : 0}</b></div>
      </div>
      <div class="filters"><input type="search" id="aq" placeholder="Cari nama atau nama pengguna" value="${esc(admin.q)}" aria-label="Cari pengguna"><button class="btn" data-action="admin-refresh">Muat ulang</button></div>
      <section class="panel"><div id="adminList" class="ulist"></div></section>
      <p class="muted small" style="margin-top:12px">Total transaksi di seluruh akun: ${s ? s.transactions : 0}.</p>`;
  return `<header class="head"><div><h1>Panel Admin</h1><p class="sub">Atur role, paket Pro, dan akun pengguna.</p></div></header>${body}`;
}

/* ---------- dialog kelola pengguna ---------- */
let currentId = null;
const userById = (id) => admin.users.find((u) => u.id === id);

function drawUserDlg() {
  const u = userById(currentId); if (!u) return;
  const self = u.id === state.user.id;
  $('#userTitle').textContent = u.name;
  $('#userBody').innerHTML = `
    <div class="uhead"><div class="av lg" aria-hidden="true">${esc((u.name || u.username).slice(0, 1).toUpperCase())}</div>
      <div><b>@${esc(u.username)}</b>${self ? ' <span class="muted">(Anda)</span>' : ''}<div class="ubadges">${roleBadge(u)}${planBadge(u)}</div></div></div>
    <p class="muted small">Terdaftar ${fmtDateTime(u.createdAt)}. Terakhir masuk ${fmtDateTime(u.lastLoginAt)}. ${u.txCount} transaksi.</p>
    <div class="field"><label for="uRole">Role</label>
      <div class="inline"><select id="uRole"><option value="user" ${u.role === 'user' ? 'selected' : ''}>Pengguna</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option></select>
      <button type="button" class="btn" data-act="role">Simpan role</button></div></div>
    <div class="field"><label>Paket: ${esc(planText(u))}</label>
      <div class="plan-btns">
        <button type="button" class="btn sm" data-act="pro" data-days="30">Pro +1 bulan</button>
        <button type="button" class="btn sm" data-act="pro" data-days="90">Pro +3 bulan</button>
        <button type="button" class="btn sm" data-act="pro" data-days="365">Pro +1 tahun</button>
        <button type="button" class="btn sm" data-act="pro" data-life="1">Pro selamanya</button>
        <button type="button" class="btn sm danger" data-act="free">Jadikan Gratis</button>
      </div>
      ${u.role === 'admin' ? '<p class="muted small">Admin selalu memiliki semua fitur Pro.</p>' : ''}</div>
    <div class="field"><label>Keamanan</label>
      <div class="plan-btns"><button type="button" class="btn sm" data-act="reset">Reset kata sandi</button>
      <button type="button" class="btn sm danger" data-act="delete" ${self ? 'disabled title="Gunakan Pengaturan > Hapus akun"' : ''}>Hapus pengguna</button></div></div>
    <div class="err" id="userErr" role="alert"></div>`;
}

export function openUserDlg(id) {
  currentId = id; drawUserDlg();
  const dlg = $('#userDlg'); if (!dlg.open) dlg.showModal();
}

async function patch(body, okMsg, button) {
  const { user } = await busy(button, () => api.patch(`/admin/users/${currentId}`, body));
  const i = admin.users.findIndex((u) => u.id === user.id);
  if (i >= 0) admin.users[i] = user;
  if (user.id === state.user.id) {
    await refreshMe();
    if (!isAdmin()) { $('#userDlg').close(); location.hash = '#/ringkasan'; rerender(); toast('Role Anda diubah. Panel admin ditutup.'); return; }
  }
  drawUserDlg(); await loadAdmin({ silent: true }); toast(okMsg);
}

export function initAdmin() {
  $('#userBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const u = userById(currentId); if (!u) return;
    $('#userErr').textContent = '';
    try {
      switch (btn.dataset.act) {
        case 'role': await patch({ role: $('#uRole').value }, 'Role diperbarui.', btn); break;
        case 'pro': await patch(btn.dataset.life ? { plan: 'pro', lifetime: true } : { plan: 'pro', proDays: Number(btn.dataset.days) }, 'Paket Pro diaktifkan.', btn); break;
        case 'free': await patch({ plan: 'free' }, 'Paket dikembalikan ke Gratis.', btn); break;
        case 'reset': {
          const ok = await confirmDialog({ title: 'Reset kata sandi?', message: `Kata sandi @${u.username} akan diganti dengan kata sandi sementara, dan semua sesi login pengguna itu berakhir.`, okLabel: 'Reset' });
          if (!ok) return;
          const r = await busy(btn, () => api.post(`/admin/users/${currentId}/reset-password`, {}));
          await confirmDialog({ title: 'Kata sandi sementara', message: `Berikan kepada @${u.username}: ${r.temporaryPassword}\nKata sandi ini hanya ditampilkan sekali. Minta pengguna menggantinya setelah masuk.`, okLabel: 'Salin dan tutup', hideCancel: true });
          try { await navigator.clipboard.writeText(r.temporaryPassword); } catch { /* abaikan */ }
          break;
        }
        case 'delete': {
          const ok = await confirmDialog({ title: `Hapus @${u.username}?`, message: `Akun dan ${u.txCount} transaksinya akan dihapus permanen.`, okLabel: 'Hapus pengguna', danger: true });
          if (!ok) return;
          await busy(btn, () => api.del(`/admin/users/${currentId}`));
          $('#userDlg').close(); await loadAdmin({ silent: true }); toast('Pengguna dihapus.');
          break;
        }
      }
    } catch (err) { const el = $('#userErr'); if (el) el.textContent = err.message; else toast(err.message); }
  });
  $('#userDlg').addEventListener('click', (e) => { if (e.target.closest('[data-action="close"]')) $('#userDlg').close(); });
}
