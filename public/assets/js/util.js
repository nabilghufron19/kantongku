// Fungsi bantu umum: DOM, format rupiah, tanggal.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = (n) => String(n).padStart(2, '0');

export const METHODS = ['Tunai', 'Transfer Bank', 'E-Wallet', 'Kartu', 'Lainnya'];
export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const rp = (n) => (n < 0 ? '-' : '') + 'Rp\u00A0' + Math.abs(Math.round(n)).toLocaleString('id-ID');
export const short = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',').replace(',0', '') + ' M';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' jt';
  if (a >= 1e3) return Math.round(n / 1e3) + ' rb';
  return String(Math.round(n));
};

export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const monthOf = (d) => d.slice(0, 7);
export const thisMonth = () => monthOf(todayStr());
export const monthLabel = (m) => { const [y, mm] = m.split('-'); return `${MONTHS[+mm - 1]} ${y}`; };
export const shiftMonth = (m, delta) => {
  let [y, mm] = m.split('-').map(Number); mm += delta;
  while (mm > 12) { mm -= 12; y++; }
  while (mm < 1) { mm += 12; y--; }
  return `${y}-${pad(mm)}`;
};
export const daysIn = (m) => { const [y, mm] = m.split('-').map(Number); return new Date(y, mm, 0).getDate(); };
export const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${+dd} ${MONTHS[+m - 1].slice(0, 3)} ${y}`; };
export const dayName = (d) => { const [y, m, dd] = d.split('-').map(Number); return DAYS[new Date(y, m - 1, dd).getDay()]; };

export const parseAmt = (s) => Number(String(s).replace(/\D/g, '')) || 0;
export const fmtInput = (s) => { const d = String(s).replace(/\D/g, '').slice(0, 12); return d ? Number(d).toLocaleString('id-ID') : ''; };
export const niceStep = (x) => { const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
export const byNewest = (a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

export const ic = (p) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
export const P = {
  chart: '<path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  sliders: '<path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
};
export const TABS = [['ringkasan', 'Ringkasan', P.chart], ['transaksi', 'Transaksi', P.list], ['anggaran', 'Anggaran', P.target], ['pengaturan', 'Pengaturan', P.sliders]];

export function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
