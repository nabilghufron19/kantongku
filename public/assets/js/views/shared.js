import { view } from '../view.js';
import { esc, ic, P, rp, fmtDate, monthLabel, thisMonth } from '../util.js';
import { catOf } from '../store.js';

export function monthNav() {
  return `<div class="monthnav">
    <button class="icon-btn" data-action="prev" aria-label="Bulan sebelumnya">${ic(P.left)}</button>
    <strong>${monthLabel(view.month)}</strong>
    <button class="icon-btn" data-action="next" aria-label="Bulan berikutnya">${ic(P.right)}</button>
    ${view.month !== thisMonth() ? '<button class="btn ghost sm" data-action="today">Bulan ini</button>' : ''}
  </div>`;
}

export function txRow(t, showDate) {
  const c = catOf(t.categoryId);
  return `<div class="row">
    <div class="ico" style="--c:${esc(c.color)}" aria-hidden="true">${esc(c.icon)}</div>
    <div class="rmain"><div class="rtitle">${esc(t.note || c.name)}</div>
      <div class="rmeta"><span>${esc(c.name)}</span><span>${esc(t.method)}</span>${showDate ? `<span>${fmtDate(t.date)}</span>` : ''}</div></div>
    <div class="ramt ${t.type}">${t.type === 'in' ? '+' : '-'}${rp(t.amount)}</div>
    <div class="racts">
      <button class="icon-btn" data-action="edit" data-id="${esc(t.id)}" aria-label="Ubah transaksi">${ic(P.edit)}</button>
      <button class="icon-btn" data-action="del" data-id="${esc(t.id)}" aria-label="Hapus transaksi">${ic(P.trash)}</button>
    </div></div>`;
}
