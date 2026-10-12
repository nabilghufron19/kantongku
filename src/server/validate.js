// Validasi dan pembersihan seluruh input dari klien.
import { HttpError } from './http.js';

export const MAX_AMOUNT = 999_999_999_999;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const bad = (message, field) => new HttpError(400, message, { field });

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function requireUuid(v, field = 'id') {
  if (!isUuid(v)) throw bad('ID tidak valid.', field);
  return v.toLowerCase();
}

export function parseType(v, field = 'type') {
  if (v !== 'in' && v !== 'out') throw bad('Jenis harus "in" (pemasukan) atau "out" (pengeluaran).', field);
  return v;
}

export function parseAmount(v, field = 'amount') {
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : v;
  if (!Number.isInteger(n) || n <= 0) throw bad('Jumlah harus bilangan bulat lebih dari nol.', field);
  if (n > MAX_AMOUNT) throw bad('Jumlah terlalu besar.', field);
  return n;
}

// Budget boleh 0 (artinya: hapus batas).
export function parseBudgetAmount(v, field = 'amount') {
  if (v === 0 || v === '0') return 0;
  return parseAmount(v, field);
}

export function parseDate(v, field = 'date') {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw bad('Tanggal harus berformat YYYY-MM-DD.', field);
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 2000 || y > 2100 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw bad('Tanggal tidak valid.', field);
  }
  return v;
}

export function cleanText(v, max, field, { required = false } = {}) {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string') throw bad('Teks tidak valid.', field);
  // buang karakter kontrol, rapikan spasi
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (required && !s) throw bad('Kolom ini wajib diisi.', field);
  if (s.length > max) throw bad(`Maksimal ${max} karakter.`, field);
  return s;
}

export function parseColor(v, field = 'color') {
  if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) throw bad('Warna harus berformat #RRGGBB.', field);
  return v.toUpperCase();
}
export const safeColor = (v, fallback = '#7A8590') => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : fallback);

export function parseIcon(v, field = 'icon') {
  const s = cleanText(v, 8, field, { required: true });
  return s;
}
export const safeIcon = (v, fallback = '📦') => {
  try { return parseIcon(v); } catch { return fallback; }
};

export function parseUsername(v, field = 'username') {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (!/^[a-z0-9_.]{3,30}$/.test(s)) {
    throw bad('Nama pengguna 3-30 karakter: huruf, angka, titik, atau garis bawah.', field);
  }
  return s;
}

export function parsePassword(v, field = 'password') {
  if (typeof v !== 'string' || v.length < 8) throw bad('Kata sandi minimal 8 karakter.', field);
  if (v.length > 128) throw bad('Kata sandi maksimal 128 karakter.', field);
  return v;
}

export function parseTransactionInput(body) {
  const out = {
    type: parseType(body.type),
    amount: parseAmount(body.amount),
    date: parseDate(body.date),
    categoryId: requireUuid(body.categoryId, 'categoryId'),
    method: cleanText(body.method ?? 'Tunai', 30, 'method') || 'Tunai',
    note: cleanText(body.note, 120, 'note'),
  };
  if (body.id !== undefined && body.id !== null) out.id = requireUuid(body.id, 'id');
  return out;
}

export function parseCategoryInput(body, { withType = true } = {}) {
  const out = {
    name: cleanText(body.name, 40, 'name', { required: true }),
    icon: parseIcon(body.icon ?? '📦'),
    color: parseColor(body.color ?? '#7A8590'),
  };
  if (withType) out.type = parseType(body.type);
  return out;
}
