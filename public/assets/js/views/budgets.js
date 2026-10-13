import { view, rerender } from '../view.js';
import { state, monthStats, outCats, replaceBudgets, isPro } from '../store.js';
import { esc, rp, shiftMonth, thisMonth } from '../util.js';
import { confirmDialog, toast } from '../ui.js';
import { monthNav } from './shared.js';
import { PRO_CHIP } from './prolock.js';
import { vGoalsSection } from './goals.js';

export function budgetStat(id) {
  const spent = monthStats(view.month).byCat[id] || 0, lim = state.budgets[id] || 0, pct = lim ? spent / lim * 100 : 0;
  const cls = pct > 100 ? 'over' : pct >= 80 ? 'warn' : '';
  const txt = !lim ? `Terpakai ${rp(spent)}. Belum ada batas.` : spent <= lim ? `Terpakai ${rp(spent)}, sisa ${rp(lim - spent)}` : `Terpakai ${rp(spent)}, lebih ${rp(spent - lim)}`;
  return `<div class="bar ${cls}"><i style="width:${Math.min(pct, 100)}%"></i></div><div class="bstat ${cls ? 'state-' + cls : ''}">${txt}</div>`;
}

export function budgetTotals() {
  const s = monthStats(view.month);
  const lim = outCats().reduce((a, c) => a + (state.budgets[c.id] || 0), 0);
  const spent = outCats().filter((c) => state.budgets[c.id]).reduce((a, c) => a + (s.byCat[c.id] || 0), 0);
  if (!lim) return '<p class="muted">Isi batas bulanan di tiap kategori. Anggaran berlaku setiap bulan.</p>';
  const pct = spent / lim * 100;
  return `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Total anggaran ${rp(lim)}</span><b>${rp(spent)} terpakai</b></div>
    <div class="bar ${pct > 100 ? 'over' : pct >= 80 ? 'warn' : ''}"><i style="width:${Math.min(pct, 100)}%"></i></div>
    <div class="bstat">${spent <= lim ? `Sisa ${rp(lim - spent)} (${Math.max(0, Math.round(100 - pct))}%)` : `Melebihi ${rp(spent - lim)}`}</div>`;
}

export function vBudget() {
  return `
  <header class="head"><div><h1>Anggaran &amp; Target</h1><p class="sub">Batas belanja tiap kategori dan target tabungan Anda.</p></div>${monthNav()}</header>
  <section class="panel" style="margin-bottom:18px"><div id="bsum">${budgetTotals()}</div>
    <div class="btns" style="margin-top:16px"><button class="btn" data-action="autobudget">Isi dari rata-rata 3 bulan terakhir ${isPro() ? '' : PRO_CHIP}</button><button class="btn ghost danger" data-action="clearbudget">Kosongkan semua batas</button></div></section>
  <section class="panel">${outCats().map((c) => `
    <div class="brow"><div class="bname"><div class="ico" style="--c:${esc(c.color)}">${esc(c.icon)}</div>${esc(c.name)}</div>
      <div class="bmid" data-bstat="${esc(c.id)}">${budgetStat(c.id)}</div>
      <label class="budget-in"><span class="muted">Rp</span><input inputmode="numeric" data-budget="${esc(c.id)}" value="${state.budgets[c.id] ? Number(state.budgets[c.id]).toLocaleString('id-ID') : ''}" placeholder="0" aria-label="Batas bulanan ${esc(c.name)}"></label></div>`).join('')}
  </section>
  ${vGoalsSection()}`;
}

export async function autoBudget() {
  const cur = thisMonth();
  const stats = [1, 2, 3].map((i) => monthStats(shiftMonth(cur, -i))).filter((s) => s.out > 0);
  if (!stats.length) return toast('Belum ada riwayat pengeluaran bulan lalu untuk dijadikan acuan.');
  if (Object.keys(state.budgets).length) {
    const ok = await confirmDialog({ title: 'Ganti batas anggaran?', message: 'Batas yang sudah ada akan diganti dengan rata-rata pengeluaran 3 bulan terakhir (ditambah 5%).', okLabel: 'Ganti' });
    if (!ok) return;
  }
  const map = {};
  for (const c of outCats()) {
    const avg = stats.reduce((a, s) => a + (s.byCat[c.id] || 0), 0) / stats.length;
    if (avg > 0) map[c.id] = Math.ceil(avg * 1.05 / 10000) * 10000;
  }
  await replaceBudgets(map);
  rerender(); toast('Anggaran diisi dari rata-rata pengeluaran.');
}

export async function clearBudgets() {
  if (!Object.keys(state.budgets).length) return;
  const ok = await confirmDialog({ title: 'Kosongkan semua batas?', message: 'Semua batas anggaran akan dihapus.', okLabel: 'Kosongkan', danger: true });
  if (!ok) return;
  await replaceBudgets({});
  rerender();
}
