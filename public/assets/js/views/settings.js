import { state } from '../store.js';
import { esc, ic, P, todayStr, download, byNewest } from '../util.js';
import { catOf } from '../store.js';
import { toast } from '../ui.js';

function catItem(c) {
  return `<div class="row"><div class="ico" style="--c:${esc(c.color)}">${esc(c.icon)}</div><div class="rmain"><div class="rtitle">${esc(c.name)}</div></div>
    <div class="racts" style="opacity:1"><button class="icon-btn" data-action="cat-edit" data-id="${esc(c.id)}" aria-label="Ubah kategori ${esc(c.name)}">${ic(P.edit)}</button>
    ${c.isFallback ? '' : `<button class="icon-btn" data-action="cat-del" data-id="${esc(c.id)}" aria-label="Hapus kategori ${esc(c.name)}">${ic(P.trash)}</button>`}</div></div>`;
}

export function vSettings(theme) {
  const sel = (v) => (theme === v ? 'selected' : '');
  return `
  <header class="head"><div><h1>Pengaturan</h1><p class="sub">Akun, tampilan, kategori, dan data.</p></div></header>
  <section class="panel set-sec"><h2>Akun</h2>
    <dl class="kv"><dt>Nama pengguna</dt><dd>${esc(state.user.username)}</dd></dl>
    <form id="nameForm" class="two" style="max-width:520px;align-items:end;margin-bottom:16px">
      <div class="field"><label for="uName">Nama tampilan</label><input id="uName" name="name" value="${esc(state.user.name)}" maxlength="40"></div>
      <div><button class="btn" type="submit">Simpan nama</button></div>
    </form>
    <div class="btns"><button class="btn" data-action="change-password">Ganti kata sandi</button><button class="btn" data-action="logout">Keluar</button></div>
  </section>
  <section class="panel set-sec"><h2>Tampilan</h2>
    <div class="field" style="max-width:260px"><label for="theme">Tema</label>
      <select id="theme"><option value="auto" ${sel('auto')}>Ikuti sistem</option><option value="light" ${sel('light')}>Terang</option><option value="dark" ${sel('dark')}>Gelap</option></select></div></section>
  <section class="panel set-sec"><h2>Kategori<button class="btn sm" data-action="cat-add">Tambah kategori</button></h2>
    <div class="catgrp"><h3>Pengeluaran</h3><div class="list">${state.cats.filter((c) => c.type === 'out').map(catItem).join('')}</div></div>
    <div class="catgrp"><h3>Pemasukan</h3><div class="list">${state.cats.filter((c) => c.type === 'in').map(catItem).join('')}</div></div>
    <p class="muted small">Kategori bawaan ("Lainnya" dan "Pemasukan lain") tidak bisa dihapus. Jika sebuah kategori dihapus, transaksinya pindah ke sana.</p>
  </section>
  <section class="panel set-sec"><h2>Data</h2>
    <p class="muted" style="margin-bottom:14px">Catatan Anda tersimpan di server (Neon) dan bisa dibuka dari komputer mana pun. Cadangan JSON berguna sebagai salinan pribadi atau untuk pindah akun.</p>
    <div class="btns">
      <button class="btn primary" data-action="export-json">Unduh cadangan (JSON)</button>
      <button class="btn" data-action="export-csv">Ekspor ke Excel (CSV)</button>
      <button class="btn" data-action="import-merge">Impor dan gabungkan</button>
      <button class="btn" data-action="import-replace">Impor dan ganti semua</button>
    </div>
    <p class="muted small" style="margin-top:12px">${state.tx.length} transaksi tersimpan. Impor menerima cadangan Kantong, termasuk dari versi index.html tunggal.</p>
  </section>
  <section class="panel set-sec danger-zone"><h2>Zona berbahaya</h2>
    <div class="btns">
      <button class="btn danger" data-action="clear-data">Hapus semua transaksi dan anggaran</button>
      <button class="btn danger" data-action="delete-account">Hapus akun</button>
    </div>
  </section>`;
}

export function exportCSV() {
  if (!state.tx.length) return toast('Belum ada transaksi untuk diekspor.');
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const rows = [['Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Metode', 'Catatan'].join(';')].concat(
    [...state.tx].sort(byNewest).map((t) => [t.date, t.type === 'in' ? 'Pemasukan' : 'Pengeluaran', q(catOf(t.categoryId).name), t.amount, q(t.method), q(t.note)].join(';')));
  download(`kantong-transaksi-${todayStr()}.csv`, '\ufeff' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  toast('File CSV diunduh. Buka dengan Excel.');
}
