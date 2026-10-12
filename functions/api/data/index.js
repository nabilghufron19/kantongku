import { json } from '../../../src/server/http.js';
import { clearData } from '../../../src/server/repo/data.js';

// Menghapus semua transaksi dan anggaran (kategori tetap).
export async function onRequestDelete({ data }) {
  await clearData(data.sql, data.user.id);
  return json({ ok: true });
}
