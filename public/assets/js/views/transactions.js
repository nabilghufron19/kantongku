import { view } from '../view.js';
import { state, catOf } from '../store.js';
import { $, esc, rp, fmtDate, dayName, monthOf, todayStr, byNewest } from '../util.js';
import { monthNav, txRow } from './shared.js';

export function filteredTx() {
  let l = state.tx.filter((t) => view.all || monthOf(t.date) === view.month);
  if (view.type !== 'all') l = l.filter((t) => t.type === view.type);
  if (view.cat !== 'all') l = l.filter((t) => t.categoryId === view.cat);
  if (view.q) {
    const q = view.q.toLowerCase().trim(), n = q.replace(/\./g, '');
    l = l.filter((t) => t.note.toLowerCase().includes(q) || catOf(t.categoryId).name.toLowerCase().includes(q) || t.method.toLowerCase().includes(q) || (n && String(t.amount).includes(n)));
  }
  const sorters = { new: byNewest, old: (a, b) => -byNewest(a, b), big: (a, b) => b.amount - a.amount, small: (a, b) => a.amount - b.amount };
  return l.sort(sorters[view.sort] || byNewest);
}

export function vTx() {
  const catOpts = ['<option value="all">Semua kategori</option>'].concat(
    ['out', 'in'].map((t) => `<optgroup label="${t === 'out' ? 'Pengeluaran' : 'Pemasukan'}">${state.cats.filter((c) => c.type === t).map((c) => `<option value="${esc(c.id)}" ${view.cat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</optgroup>`),
  ).join('');
  const sel = (v, cur) => (v === cur ? 'selected' : '');
  return `
  <header class="head"><div><h1>Transaksi</h1><p class="sub">Cari, saring, ubah, atau hapus catatan.</p></div>${view.all ? '' : monthNav()}</header>
  <div class="filters">
    <input type="search" id="q" placeholder="Cari catatan, kategori, atau jumlah" value="${esc(view.q)}" aria-label="Cari transaksi">
    <select id="fType" aria-label="Jenis"><option value="all">Semua jenis</option><option value="out" ${sel('out', view.type)}>Pengeluaran</option><option value="in" ${sel('in', view.type)}>Pemasukan</option></select>
    <select id="fCatF" aria-label="Kategori">${catOpts}</select>
    <select id="fSort" aria-label="Urutan"><option value="new">Terbaru</option><option value="old" ${sel('old', view.sort)}>Terlama</option><option value="big" ${sel('big', view.sort)}>Jumlah terbesar</option><option value="small" ${sel('small', view.sort)}>Jumlah terkecil</option></select>
    <label class="chk"><input type="checkbox" id="fAll" ${view.all ? 'checked' : ''}> Semua waktu</label>
  </div>
  <section class="panel"><div id="txList"></div></section>`;
}

export function updateTxList() {
  const box = $('#txList'); if (!box) return;
  const l = filteredTx();
  if (!l.length) {
    box.innerHTML = `<div class="empty">${state.tx.length ? 'Tidak ada transaksi yang cocok dengan penyaringan ini.' : 'Belum ada transaksi.'}<br><button class="btn primary" data-action="add">Catat transaksi</button></div>`;
    return;
  }
  const inc = l.filter((t) => t.type === 'in').reduce((a, t) => a + t.amount, 0);
  const out = l.filter((t) => t.type === 'out').reduce((a, t) => a + t.amount, 0);
  let html = `<div class="sumbar"><span><b>${l.length}</b> transaksi</span><span>Masuk <b style="color:var(--in)">${rp(inc)}</b></span><span>Keluar <b style="color:var(--out)">${rp(out)}</b></span></div><div class="list">`;
  if (view.sort === 'new' || view.sort === 'old') {
    const dayOut = {};
    for (const t of l) if (t.type === 'out') dayOut[t.date] = (dayOut[t.date] || 0) + t.amount;
    let last = null;
    for (const t of l) {
      if (t.date !== last) {
        last = t.date;
        const lbl = t.date === todayStr() ? 'Hari ini' : dayName(t.date);
        html += `<div class="dh"><span>${lbl}, ${fmtDate(t.date)}</span><span>${dayOut[t.date] ? 'Keluar ' + rp(dayOut[t.date]) : ''}</span></div>`;
      }
      html += txRow(t, false);
    }
  } else html += l.map((t) => txRow(t, true)).join('');
  box.innerHTML = html + '</div>';
}
