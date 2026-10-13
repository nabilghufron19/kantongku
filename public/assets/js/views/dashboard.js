import { view } from '../view.js';
import { state, monthStats, catOf, outCats, isPro, isDemo } from '../store.js';
import { esc, rp, short, fmtDate, shiftMonth, daysIn, thisMonth, todayStr, MONTHS, byNewest } from '../util.js';
import { donut, dayChart } from '../charts.js';
import { monthNav, txRow } from './shared.js';
import { proLock, PRO_CHIP } from './prolock.js';

function budgetRows(s, limit = 5) {
  const rows = outCats().filter((c) => state.budgets[c.id]).map((c) => {
    const spent = s.byCat[c.id] || 0, lim = state.budgets[c.id];
    return { c, spent, lim, pct: spent / lim * 100 };
  }).sort((a, b) => b.pct - a.pct).slice(0, limit);
  if (!rows.length) return '<div class="empty">Belum ada anggaran.<br><a class="btn sm" href="#/anggaran" style="margin-top:12px">Atur anggaran</a></div>';
  return '<div class="bud">' + rows.map(({ c, spent, lim, pct }) => `
    <div class="bud-row"><div class="top"><span>${esc(c.icon)} ${esc(c.name)}</span><span class="${pct > 100 ? 'state-over' : pct >= 80 ? 'state-warn' : ''}">${short(spent)} dari ${short(lim)}</span></div>
    <div class="bar ${pct > 100 ? 'over' : pct >= 80 ? 'warn' : ''}"><i style="width:${Math.min(pct, 100)}%"></i></div></div>`).join('') + '</div>';
}

function walletsBody() {
  const sums = new Map();
  for (const t of state.tx) sums.set(t.method, (sums.get(t.method) || 0) + (t.type === 'in' ? t.amount : -t.amount));
  const rows = [...sums].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (!rows.length) return '<div class="empty">Belum ada transaksi.</div>';
  const max = Math.max(...rows.map(([, v]) => Math.abs(v)), 1);
  return '<div class="wallets">' + rows.map(([name, v]) => `<div class="wallet"><div class="top"><span>${esc(name)}</span><b class="${v < 0 ? 'out' : ''}">${rp(v)}</b></div>
    <div class="bar"><i style="width:${Math.abs(v) / max * 100}%;background:${v < 0 ? 'var(--out)' : 'var(--accent)'}"></i></div></div>`).join('') + '</div>';
}

function goalsMini() {
  const list = state.goals.slice(0, 3);
  if (!list.length) return '<div class="empty">Belum ada target.<br><a class="btn sm" href="#/anggaran" style="margin-top:12px">Buat target</a></div>';
  return '<div class="bud">' + list.map((g) => { const pct = Math.min(100, g.savedAmount / g.targetAmount * 100);
    return `<div class="bud-row"><div class="top"><span>${esc(g.icon)} ${esc(g.name)}</span><span>${Math.round(pct)}%</span></div><div class="bar"><i style="width:${pct}%;background:${esc(g.color)}"></i></div></div>`; }).join('') + '</div>';
}

export function vDashboard() {
  const m = view.month, s = monthStats(m), p = monthStats(shiftMonth(m, -1)), cur = thisMonth();
  const net = s.inc - s.out;
  const total = state.tx.reduce((a, t) => a + (t.type === 'in' ? t.amount : -t.amount), 0);
  const elapsed = m === cur ? +todayStr().slice(8) : m < cur ? daysIn(m) : 1;
  const avg = s.out / elapsed;

  let sub;
  if (p.out > 0 && s.out > 0) {
    const d = (s.out - p.out) / p.out * 100;
    sub = `Pengeluaran ${Math.abs(Math.round(d))}% ${d > 0 ? 'lebih besar' : 'lebih kecil'} dari ${MONTHS[+shiftMonth(m, -1).slice(5) - 1].toLowerCase()}.`;
  } else if (!s.list.length) sub = 'Belum ada catatan di bulan ini.';
  else sub = net >= 0 ? 'Pemasukan masih lebih besar dari pengeluaran.' : 'Pengeluaran sudah melebihi pemasukan bulan ini.';

  const denom = Math.max(s.inc, s.out, 1);
  const segs = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]);
  const strip = segs.map(([id, v]) => { const c = catOf(id); return `<i style="width:${v / denom * 100}%;background:${esc(c.color)}" title="${esc(c.name)}: ${rp(v)}"></i>`; }).join('') + (s.inc > s.out ? '<i class="rest" title="Sisa"></i>' : '');
  const cap = segs.slice(0, 5).map(([id, v]) => { const c = catOf(id); return `<span><span class="dot" style="--c:${esc(c.color)}"></span>${esc(c.name)} ${short(v)}</span>`; }).join('') + (s.inc > s.out ? '<span><span class="dot" style="--c:var(--line)"></span>Sisa</span>' : '');

  const ins = [];
  if (segs.length) { const [id, v] = segs[0], c = catOf(id); ins.push(`Terbesar: <b>${esc(c.icon)} ${esc(c.name)}</b> sebesar ${rp(v)}, ${Math.round(v / s.out * 100)}% dari seluruh pengeluaran.`); }
  if (s.out) ins.push(`Rata-rata pengeluaran <b>${rp(avg)}</b> per hari.`);
  if (m === cur && s.out) ins.push(`Jika pola ini berlanjut, pengeluaran akhir bulan sekitar <b>${rp(avg * daysIn(m))}</b>.`);
  if (s.inc > 0 && s.out > 0) { const r = Math.round(net / s.inc * 100); ins.push(`Sisa uang ${r}% dari pemasukan. ${r >= 20 ? 'Angka ini sudah sehat.' : r >= 0 ? 'Cobalah sisihkan minimal 20%.' : 'Pengeluaran melebihi pemasukan.'}`); }
  const big = s.list.filter((t) => t.type === 'out').sort((a, b) => b.amount - a.amount)[0];
  if (big) ins.push(`Pengeluaran tunggal terbesar: <b>${rp(big.amount)}</b> untuk ${esc(big.note || catOf(big.categoryId).name)} (${fmtDate(big.date)}).`);

  const recent = [...s.list].sort(byNewest).slice(0, 5);
  const empty = !state.tx.length;
  return `
  <header class="head"><div><h1>Ringkasan</h1><p class="sub">Gambaran uang masuk dan keluar bulan ini.</p></div>${monthNav()}</header>
  ${(!isPro() && !isDemo()) ? `<div class="promo"><span>✨ <b>Kantong Pro</b>: laporan tren, target tabungan, saldo per dompet, dan cetak PDF.</span><button class="btn gold sm" data-action="upgrade">Lihat fitur Pro</button></div>` : ''}
  ${state.truncated ? '<div class="banner bad"><span>Jumlah transaksi sangat banyak, hanya 50.000 terbaru yang dimuat. Total saldo mungkin tidak akurat.</span></div>' : ''}
  ${empty ? `<div class="panel empty" style="margin-bottom:18px"><b style="color:var(--ink)">Mulai dengan satu catatan.</b><br>Catat pengeluaran atau pemasukan pertama Anda.<br><div class="btns" style="justify-content:center;margin-top:12px"><button class="btn primary" data-action="add">Catat transaksi</button></div></div>` : ''}
  <section class="hero" aria-label="Posisi keuangan bulan ini">
    <div class="hero-top">
      <div><p class="hero-label">Sisa bulan ini</p><div class="hero-num ${net < 0 ? 'neg' : ''}">${rp(net)}</div><p class="hero-sub">${esc(sub)}</p></div>
      <div class="stats">
        <div class="stat"><span>Pengeluaran</span><b class="out">${rp(s.out)}</b></div>
        <div class="stat"><span>Pemasukan</span><b class="in">${rp(s.inc)}</b></div>
        <div class="stat"><span>Total saldo</span><b>${rp(total)}</b></div>
      </div>
    </div>
    ${segs.length ? `<div class="strip" role="img" aria-label="Pengeluaran dibanding pemasukan">${strip}</div><div class="strip-cap">${cap}</div>` : ''}
  </section>
  <div class="grid g2">
    <section class="panel"><h2>Pengeluaran per kategori</h2>${donut(s.byCat, s.out)}</section>
    <section class="panel"><h2>Pengeluaran harian</h2>${dayChart(m, s.byDay)}</section>
  </div>
  <div class="grid g2b">
    <section class="panel"><h2>Anggaran<a href="#/anggaran">Atur</a></h2>${budgetRows(s)}</section>
    <section class="panel"><h2>Catatan penting</h2>${ins.length ? `<ul class="insights">${ins.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<div class="empty">Catatan penting muncul setelah ada pengeluaran.</div>'}</section>
  </div>
  <div class="grid g2b">
    <section class="panel"><h2>Saldo per dompet ${isPro() ? '' : PRO_CHIP}</h2>${isPro() ? walletsBody() : proLock({ title: 'Saldo per Dompet', blurb: 'Lihat sisa uang di tunai, rekening bank, dan e-wallet.', render: walletsBody })}</section>
    <section class="panel"><h2>Target tabungan ${isPro() ? '' : PRO_CHIP}<a href="#/anggaran">Kelola</a></h2>${isPro() ? goalsMini() : proLock({ title: 'Target Tabungan', blurb: 'Pasang target dan pantau progresnya.', render: goalsMini })}</section>
  </div>
  <section class="panel"><h2>Transaksi terbaru<a href="#/transaksi">Lihat semua</a></h2>
    ${recent.length ? `<div class="list">${recent.map((t) => txRow(t, true)).join('')}</div>` : '<div class="empty">Belum ada transaksi bulan ini.</div>'}
  </section>`;
}
