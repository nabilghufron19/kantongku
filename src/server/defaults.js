// Kategori bawaan yang dibuat otomatis untuk setiap akun baru.
// "Lainnya" dan "Pemasukan lain" bertanda isFallback: tidak bisa dihapus,
// dan menampung transaksi dari kategori yang dihapus.
export const DEFAULT_CATEGORIES = [
  { name: 'Makan & Minum',       icon: '🍽️', color: '#E07A3F', type: 'out' },
  { name: 'Transportasi',        icon: '🚌', color: '#3F7FE0', type: 'out' },
  { name: 'Belanja',             icon: '🛍️', color: '#B04FD0', type: 'out' },
  { name: 'Tagihan & Pulsa',     icon: '💡', color: '#D4A82A', type: 'out' },
  { name: 'Kesehatan',           icon: '💊', color: '#D2475F', type: 'out' },
  { name: 'Pendidikan',          icon: '📚', color: '#2A9D8F', type: 'out' },
  { name: 'Hiburan',             icon: '🎮', color: '#6A5ACD', type: 'out' },
  { name: 'Sedekah & Zakat',     icon: '🤲', color: '#2E8B57', type: 'out' },
  { name: 'Lainnya',             icon: '📦', color: '#7A8590', type: 'out', isFallback: true },
  { name: 'Gaji',                icon: '💼', color: '#1F7A4D', type: 'in' },
  { name: 'Kiriman / Uang saku', icon: '🎁', color: '#3AA57A', type: 'in' },
  { name: 'Usaha sampingan',     icon: '🏪', color: '#5B9BD5', type: 'in' },
  { name: 'Pemasukan lain',      icon: '💰', color: '#8AA04A', type: 'in', isFallback: true },
];

export const FALLBACK_DEFAULTS = {
  out: DEFAULT_CATEGORIES.find((c) => c.type === 'out' && c.isFallback),
  in: DEFAULT_CATEGORIES.find((c) => c.type === 'in' && c.isFallback),
};

export const METHODS = ['Tunai', 'Transfer Bank', 'E-Wallet', 'Kartu', 'Lainnya'];
