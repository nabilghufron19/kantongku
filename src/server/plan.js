// Role dan paket: aturan akses fitur Pro.
import { HttpError } from './http.js';

// Admin otomatis mendapat semua fitur. Pro berlaku jika plan 'pro' dan belum lewat tanggal berakhir
// (pro_until kosong = selamanya).
export function isProUser(u, now = Date.now()) {
  if (!u) return false;
  if (u.role === 'admin') return true;
  if (u.plan !== 'pro') return false;
  if (u.proUntil === null || u.proUntil === undefined) return true;
  return new Date(u.proUntil).getTime() > now;
}

export function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role || 'user',
    plan: u.plan || 'free',
    proUntil: u.proUntil ?? null,
    isPro: isProUser(u),
  };
}

export function requirePro(user) {
  if (!user || !user.isPro) {
    throw new HttpError(403, 'Fitur ini khusus pengguna Pro. Upgrade untuk membukanya.', { code: 'pro_required' });
  }
}

export function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    throw new HttpError(403, 'Hanya admin yang boleh mengakses bagian ini.', { code: 'admin_required' });
  }
}
