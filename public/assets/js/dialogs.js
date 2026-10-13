// Dialog tambah/ubah transaksi, kategori, dan ganti kata sandi.
import { state, saveTx, saveCat, changePassword, removeTx, restoreTx, saveGoal, depositGoal, isDemo } from './store.js';
import { rerender } from './view.js';
import { $, esc, METHODS, todayStr, parseAmt, fmtInput, monthOf, monthLabel, rp } from './util.js';
import { PRO_FEATURES, waLink, WA_DISPLAY } from './config.js';
import { toast, busy } from './ui.js';

const EMOJIS = ['🍽️', '🚌', '🛍️', '💡', '💊', '📚', '🎮', '🤲', '🏠', '📱', '👕', '☕', '🎁', '💼', '🏪', '🐾', '✈️', '🧾', '💰', '📦'];
let editingTx = null, editingCat = null, editingGoal = null, depositTarget = null;

/* ---------- transaksi ---------- */
function fillCats(type, selected) {
  const list = state.cats.filter((c) => c.type === type);
  $('#fCat').innerHTML = list.map((c) => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
  $('#fCat').value = list.some((c) => c.id === selected) ? selected : (list[0] || {}).id;
}

export function openTx(id) {
  const t = id ? state.tx.find((x) => x.id === id) : null;
  const form = $('#txForm');
  editingTx = t ? t.id : null;
  $('#txTitle').textContent = t ? 'Ubah transaksi' : 'Catat transaksi';
  $('#saveMore').style.display = t ? 'none' : '';
  $('#txDelete').hidden = !t;
  const methods = t && !METHODS.includes(t.method) ? [...METHODS, t.method] : METHODS;
  $('#fMethod').innerHTML = methods.map((m) => `<option>${esc(m)}</option>`).join('');
  const type = t ? t.type : 'out';
  form.elements.type.value = type;
  fillCats(type, t ? t.categoryId : null);
  $('#fAmount').value = t ? t.amount.toLocaleString('id-ID') : '';
  $('#fDate').value = t ? t.date : todayStr();
  $('#fMethod').value = t ? t.method : 'Tunai';
  $('#fNote').value = t ? t.note : '';
  $('#txErr').textContent = '';
  if (!$('#txDlg').open) $('#txDlg').showModal();
  $('#fAmount').focus();
}

async function submitTx(again) {
  const f = $('#txForm').elements;
  const amount = parseAmt(f.amount.value), date = f.date.value;
  if (!amount) { $('#txErr').textContent = 'Isi jumlah lebih dari nol.'; $('#fAmount').focus(); return; }
  if (!date) { $('#txErr').textContent = 'Pilih tanggal transaksi.'; return; }
  const input = { type: f.type.value, amount, date, categoryId: f.categoryId.value, method: f.method.value, note: f.note.value.trim() };
  const wasEditing = Boolean(editingTx);
  try {
    await busy([$('#txSave'), $('#saveMore')], () => saveTx(input, editingTx));
  } catch (err) { $('#txErr').textContent = err.message; return; }
  const msg = wasEditing ? 'Perubahan tersimpan.' : monthOf(date) !== monthOf(todayStr()) ? `Tersimpan di ${monthLabel(monthOf(date))}.` : 'Transaksi tersimpan.';
  if (again) { $('#fAmount').value = ''; $('#fNote').value = ''; $('#txErr').textContent = ''; $('#fAmount').focus(); }
  else $('#txDlg').close();
  rerender(); toast(msg);
}

// Hapus transaksi, dengan tombol "Batalkan" yang mengirim ulang ID yang sama.
export async function deleteTx(id) {
  try {
    const t = await removeTx(id);
    rerender();
    if (t) toast('Transaksi dihapus.', { label: 'Batalkan', fn: async () => { try { await restoreTx(t); rerender(); } catch (e) { toast(e.message); } } });
  } catch (e) { toast(e.message || 'Gagal menghapus transaksi.'); }
}

/* ---------- kategori ---------- */
export function openCat(id) {
  const c = id ? state.cats.find((x) => x.id === id) : null;
  const f = $('#catForm').elements;
  editingCat = c ? c.id : null;
  $('#catTitle').textContent = c ? 'Ubah kategori' : 'Kategori baru';
  f.name.value = c ? c.name : '';
  f.type.value = c ? c.type : 'out';
  f.type.disabled = Boolean(c);
  f.icon.value = c ? c.icon : '📦';
  f.color.value = c ? c.color : '#2E3FA3';
  $('#catErr').textContent = '';
  $('#emojis').innerHTML = EMOJIS.map((e) => `<button type="button" data-emoji="${e}" aria-label="Pakai ikon ${e}">${e}</button>`).join('');
  $('#catDlg').showModal();
  f.name.focus();
}

/* ---------- target tabungan ---------- */
export function openGoal(id) {
  const g = id ? state.goals.find((x) => x.id === id) : null;
  const f = $('#goalForm').elements;
  editingGoal = g ? g.id : null;
  $('#goalTitle').textContent = g ? 'Ubah target' : 'Target baru';
  f.name.value = g ? g.name : '';
  f.target.value = g ? g.targetAmount.toLocaleString('id-ID') : '';
  f.deadline.value = g && g.deadline ? g.deadline : '';
  f.icon.value = g ? g.icon : '🎯';
  f.color.value = g ? g.color : '#2E3FA3';
  $('#goalErr').textContent = '';
  $('#goalDlg').showModal();
  f.name.focus();
}

export function openDeposit(id, mode) {
  const g = state.goals.find((x) => x.id === id); if (!g) return;
  depositTarget = { id, mode };
  $('#depTitle').textContent = mode === 'out' ? `Tarik dari "${g.name}"` : `Setor ke "${g.name}"`;
  $('#depInfo').textContent = `Terkumpul ${rp(g.savedAmount)} dari ${rp(g.targetAmount)}.`;
  $('#depSave').textContent = mode === 'out' ? 'Tarik' : 'Setor';
  $('#depAmount').value = '';
  $('#depErr').textContent = '';
  $('#depDlg').showModal();
  $('#depAmount').focus();
}

// Dialog ajakan upgrade: daftar fitur Pro dan tautan WhatsApp.
export function openUpgrade(feature) {
  $('#proLead').textContent = feature ? `${feature} adalah fitur Kantong Pro.` : 'Buka semua fitur Kantong Pro.';
  $('#proList').innerHTML = PRO_FEATURES.map((f) => `<li><span class="pf-ico" aria-hidden="true">${f.icon}</span><span><b>${esc(f.name)}</b><br><span class="muted small">${esc(f.desc)}</span></span></li>`).join('');
  const who = state.user && !isDemo() ? ` Nama pengguna saya: ${state.user.username}.` : '';
  $('#proWa').href = waLink(`Halo, saya ingin upgrade Kantong ke Pro.${who}`);
  $('#proWaNum').textContent = WA_DISPLAY;
  $('#proDlg').showModal();
}

/* ---------- kata sandi ---------- */
export function openPass() {
  $('#passForm').reset();
  $('#passErr').textContent = '';
  $('#passDlg').showModal();
  $('#pCur').focus();
}

export function initDialogs() {
  // tombol tutup di setiap dialog
  for (const dlg of document.querySelectorAll('dialog')) {
    dlg.addEventListener('click', (e) => { if (e.target.closest('[data-action="close"]')) dlg.close(); });
  }

  const txForm = $('#txForm');
  txForm.addEventListener('submit', (e) => { e.preventDefault(); submitTx(false); });
  $('#saveMore').addEventListener('click', () => submitTx(true));
  $('#txDelete').addEventListener('click', () => { const id = editingTx; $('#txDlg').close(); if (id) deleteTx(id); });
  txForm.addEventListener('change', (e) => { if (e.target.name === 'type') fillCats(e.target.value); });
  $('#fAmount').addEventListener('input', (e) => { e.target.value = fmtInput(e.target.value); });
  txForm.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-add]');
    if (!chip) return;
    const cur = parseAmt($('#fAmount').value);
    $('#fAmount').value = chip.dataset.add === 'clear' ? '' : fmtInput(cur + Number(chip.dataset.add));
    $('#fAmount').focus();
  });

  $('#emojis').addEventListener('click', (e) => {
    const b = e.target.closest('[data-emoji]');
    if (b) $('#catForm').elements.icon.value = b.dataset.emoji;
  });
  $('#catForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements, name = f.name.value.trim();
    if (!name) { $('#catErr').textContent = 'Isi nama kategori.'; return; }
    try {
      await busy($('#catSave'), () => saveCat({ name, icon: f.icon.value.trim() || '📦', color: f.color.value, type: f.type.value }, editingCat));
    } catch (err) { $('#catErr').textContent = err.message; return; }
    $('#catDlg').close(); rerender(); toast('Kategori tersimpan.');
  });

  $('#goalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements, target = parseAmt(f.target.value);
    if (!f.name.value.trim()) { $('#goalErr').textContent = 'Isi nama target.'; return; }
    if (!target) { $('#goalErr').textContent = 'Isi jumlah target lebih dari nol.'; return; }
    try {
      await busy($('#goalSave'), () => saveGoal({ name: f.name.value.trim(), icon: f.icon.value.trim() || '🎯', color: f.color.value, targetAmount: target, deadline: f.deadline.value || null }, editingGoal));
    } catch (err) { $('#goalErr').textContent = err.message; return; }
    $('#goalDlg').close(); rerender(); toast('Target tersimpan.');
  });
  $('#goalTarget').addEventListener('input', (e) => { e.target.value = fmtInput(e.target.value); });
  $('#depAmount').addEventListener('input', (e) => { e.target.value = fmtInput(e.target.value); });
  $('#depForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseAmt($('#depAmount').value);
    if (!amount) { $('#depErr').textContent = 'Isi jumlah lebih dari nol.'; return; }
    try {
      await busy($('#depSave'), () => depositGoal(depositTarget.id, depositTarget.mode === 'out' ? -amount : amount));
    } catch (err) { $('#depErr').textContent = err.message; return; }
    $('#depDlg').close(); rerender(); toast(depositTarget.mode === 'out' ? 'Penarikan dicatat.' : 'Setoran dicatat.');
  });

  $('#passForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    if (!f.currentPassword.value) { $('#passErr').textContent = 'Isi kata sandi saat ini.'; return; }
    if (f.newPassword.value.length < 8) { $('#passErr').textContent = 'Kata sandi baru minimal 8 karakter.'; return; }
    if (f.newPassword.value !== f.again.value) { $('#passErr').textContent = 'Pengulangan kata sandi tidak sama.'; return; }
    try {
      await busy($('#passSave'), () => changePassword(f.currentPassword.value, f.newPassword.value));
    } catch (err) { $('#passErr').textContent = err.message; return; }
    $('#passDlg').close(); toast('Kata sandi diganti. Perangkat lain perlu masuk ulang.');
  });
}
