// Grafik SVG tanpa pustaka: donat per kategori dan batang harian.
import { esc, rp, short, niceStep, MONTHS, thisMonth, todayStr } from './util.js';
import { catOf } from './store.js';

export function donut(byCat, total) {
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (!total) return '<div class="empty">Belum ada pengeluaran bulan ini.</div>';
  let acc = 0;
  const arcs = entries.map(([id, v]) => {
    const pct = v / total * 100, c = catOf(id);
    const s = `<circle r="15.9155" cx="21" cy="21" fill="none" stroke="${esc(c.color)}" stroke-width="6" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - acc}"><title>${esc(c.name)}: ${rp(v)}</title></circle>`;
    acc += pct; return s;
  }).join('');
  const legend = entries.slice(0, 7).map(([id, v]) => {
    const c = catOf(id);
    return `<div><span class="dot" style="--c:${esc(c.color)}"></span><span class="nm">${esc(c.icon)} ${esc(c.name)}</span><b>${short(v)}</b><span class="pc">${Math.round(v / total * 100)}%</span></div>`;
  }).join('') + (entries.length > 7 ? `<div class="muted">dan ${entries.length - 7} kategori lain</div>` : '');
  return `<div class="donut-wrap">
    <svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Pengeluaran per kategori">
      <circle r="15.9155" cx="21" cy="21" fill="none" stroke="var(--surface2)" stroke-width="6"/>${arcs}
      <text x="21" y="20.5" text-anchor="middle" font-size="3" style="fill:var(--muted)">Total</text>
      <text x="21" y="25.5" text-anchor="middle" font-size="4.4" font-weight="700">${short(total)}</text>
    </svg>
    <div class="legend">${legend}</div></div>`;
}

export function dayChart(m, byDay) {
  // ukuran gambar menyesuaikan layar supaya angka sumbu tetap terbaca di ponsel
  const narrow = window.matchMedia('(max-width: 820px)').matches;
  const W = narrow ? 340 : 640, H = narrow ? 190 : 210, L = narrow ? 40 : 46, B = 24, T = 10, R = 6, n = byDay.length;
  const max = Math.max(...byDay, 1), step = niceStep(max / 4), top = step * Math.ceil(max / step);
  const bw = (W - L - R) / n, ch = H - T - B;
  const today = +todayStr().slice(8);
  let g = '';
  for (let v = 0; v <= top + 1e-9; v += step) {
    const y = T + ch * (1 - v / top);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${short(v)}</text>`;
  }
  const bars = byDay.map((v, i) => {
    const h = ch * v / top, x = L + i * bw + bw * .17, w = bw * .66, d = i + 1;
    const hl = m === thisMonth() && d === today;
    return `<rect x="${x}" y="${T + ch - h}" width="${w}" height="${Math.max(h, v ? 2 : 0)}" rx="2.5" fill="${hl ? 'var(--gold)' : 'var(--accent)'}" opacity="${v ? 1 : 0}"><title>${d} ${MONTHS[+m.slice(5) - 1]}: ${rp(v)}</title></rect>` +
      ((d === 1 || d % 5 === 0) ? `<text x="${x + w / 2}" y="${H - 7}" text-anchor="middle">${d}</text>` : '');
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pengeluaran harian">${g}${bars}</svg>`;
}
