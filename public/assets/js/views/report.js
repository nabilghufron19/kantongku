// Laporan & Tren (fitur Pro).
import { view } from '../view.js';
import { state, monthStats, catOf, isPro } from '../store.js';
import { esc, rp, short, shiftMonth, thisMonth, monthOf, monthLabel } from '../util.js';
import { monthsChart, weekdayChart } from '../charts.js';
import { proLock, PRO_CHIP } from './prolock.js';

const DOW_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const dowMon = (d) => { const [y, m, dd] = d.split('-').map(Number); return (new Date(y, m - 1, dd).getDay() + 6) % 7; };
const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0);

function reportBody() {
  const n = view.rm || 6, end = thisMonth();
  const months = Array.from({ length: n }, (_, i) => shiftMonth(end, -(n - 1 - i)));
  const stats = months.map((m) => ({ m, ...monthStats(m) }));
  const prev = Array.from({ length: n }, (_, i) => monthStats(shiftMonth(end, -(2 * n - 1 - i))));

  const inc = sum(stats, 'inc'), out = sum(stats, 'out');
  const active = stats.filter((s) => s.inc || s.out).length || 1;
  const rate = inc > 0 ? Math.round((inc - out) / inc * 100) : null;

  const byCat = {}, prevByCat = {};
  for (const s of stats) for (const [id, v] of Object.entries(s.byCat)) byCat[id] = (byCat[id] || 0) + v;
  for (const s of prev) for (const [id, v] of Object.entries(s.byCat)) prevByCat[id] = (prevByCat[id] || 0) + v;
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const inWindow = new Set(months), wd = Array(7).fill(0);
  for (const t of state.tx) if (t.type === 'out' && inWindow.has(monthOf(t.date))) wd[dowMon(t.date)] += t.amount;

  const ins = [];
  const worst = [...stats].sort((a, b) => b.out - a.out)[0];
  if (worst && worst.out > 0) ins.push(`Pengeluaran terbesar terjadi di <b>${monthLabel(worst.m)}</b>: ${rp(worst.out)}.`);
  if (n >= 3 && stats[n - 2].out > 0 && stats[n - 3].out > 0) {
    const d = (stats[n - 2].out - stats[n - 3].out) / stats[n - 3].out * 100;
    ins.push(`Bulan lalu pengeluaran <b>${Math.abs(Math.round(d))}% ${d > 0 ? 'lebih besar' : 'lebih kecil'}</b> dari bulan sebelumnya.`);
  }
  if (Math.max(...wd) > 0) ins.push(`Hari paling boros adalah <b>${DOW_LONG[wd.indexOf(Math.max(...wd))]}</b> (total ${rp(Math.max(...wd))}).`);
  const rising = Object.entries(byCat).map(([id, v]) => [id, v - (prevByCat[id] || 0)]).sort((a, b) => b[1] - a[1])[0];
  if (rising && rising[1] > 0 && Object.keys(prevByCat).length) { const c = catOf(rising[0]); ins.push(`Kategori yang paling naik: <b>${esc(c.icon)} ${esc(c.name)}</b>, bertambah ${rp(rising[1])} dibanding ${n} bulan sebelumnya.`); }
  if (rate !== null) ins.push(`Rata-rata Anda menyisihkan <b>${rate}%</b> dari pemasukan. ${rate >= 20 ? 'Sudah sehat.' : rate >= 0 ? 'Targetkan minimal 20%.' : 'Pengeluaran melebihi pemasukan.'}`);

  const catRows = top.map(([id, v]) => {
    const c = catOf(id), pc = out ? v / out * 100 : 0, before = prevByCat[id] || 0;
    const delta = before ? Math.round((v - before) / before * 100) : null;
    return `<div class="rank"><div class="rank-top"><span>${esc(c.icon)} ${esc(c.name)}</span><span><b>${short(v)}</b> <span class="muted">${Math.round(pc)}%${delta === null ? '' : ` · ${delta >= 0 ? 'naik' : 'turun'} ${Math.abs(delta)}%`}</span></span></div>
      <div class="bar"><i style="width:${pc}%;background:${esc(c.color)}"></i></div></div>`;
  }).join('') || '<div class="empty">Belum ada pengeluaran pada periode ini.</div>';

  return `
  <div class="print-only print-head"><b>Laporan Keuangan</b> &middot; ${monthLabel(months[0])} sampai ${monthLabel(end)} &middot; ${esc(state.user.name)}</div>
  <div class="kpis">
    <div class="kpi"><span>Total pemasukan</span><b class="in">${rp(inc)}</b></div>
    <div class="kpi"><span>Total pengeluaran</span><b class="out">${rp(out)}</b></div>
    <div class="kpi"><span>Rata-rata per bulan</span><b>${rp(out / active)}</b></div>
    <div class="kpi"><span>Tingkat tabungan</span><b>${rate === null ? '-' : rate + '%'}</b></div>
  </div>
  <section class="panel" style="margin-bottom:18px"><h2>Pemasukan dan pengeluaran per bulan
    <span class="legend-inline"><span><i class="dot" style="--c:var(--in)"></i>Masuk</span><span><i class="dot" style="--c:var(--out)"></i>Keluar</span></span></h2>${monthsChart(stats)}</section>
  <div class="grid g2b">
    <section class="panel"><h2>Kategori terbesar</h2><div class="ranks">${catRows}</div></section>
    <section class="panel"><h2>Pengeluaran per hari dalam seminggu</h2>${weekdayChart(wd)}</section>
  </div>
  <section class="panel"><h2>Wawasan otomatis</h2>${ins.length ? `<ul class="insights">${ins.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<div class="empty">Wawasan muncul setelah ada beberapa transaksi.</div>'}</section>`;
}

export function vReport() {
  const pro = isPro();
  const n = view.rm || 6;
  const controls = pro ? `<div class="head-actions">
      <div class="rangebar" role="group" aria-label="Periode">${[3, 6, 12].map((x) => `<button type="button" class="${n === x ? 'on' : ''}" data-action="report-range" data-n="${x}">${x} bulan</button>`).join('')}</div>
      <button class="btn" data-action="print-report">Cetak / PDF</button></div>` : '';
  return `
  <header class="head"><div><h1>Laporan &amp; Tren ${pro ? '' : PRO_CHIP}</h1><p class="sub">Pola pemasukan dan pengeluaran dari bulan ke bulan.</p></div>${controls}</header>
  ${pro ? reportBody() : proLock({
    title: 'Laporan & Tren',
    blurb: 'Grafik 3/6/12 bulan, kategori terbesar, pola hari boros, wawasan otomatis, dan cetak PDF.',
    render: reportBody,
  })}`;
}
