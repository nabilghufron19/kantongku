// Pengaturan merek dan kontak upgrade. Ubah di sini jika nomor atau nama berganti.
export const BRAND_NAME = 'Nabil Ghufron';
export const BRAND_YEAR = '2026';

// Format internasional tanpa tanda + (0853-3510-1970 -> 62 853-3510-1970)
export const WA_NUMBER = '6285335101970';
export const WA_DISPLAY = '0853-3510-1970';

export const waLink = (message) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

export const PRO_FEATURES = [
  { icon: '📈', name: 'Laporan & Tren', desc: 'Grafik 3/6/12 bulan, kategori terbesar, pola hari boros, dan wawasan otomatis.' },
  { icon: '🎯', name: 'Target Tabungan', desc: 'Pasang target, setor bertahap, dan lihat berapa yang perlu disisihkan per bulan.' },
  { icon: '👛', name: 'Saldo per Dompet', desc: 'Pantau sisa uang di tunai, rekening bank, dan e-wallet.' },
  { icon: '🖨️', name: 'Cetak Laporan PDF', desc: 'Simpan laporan bulanan yang rapi sebagai PDF.' },
  { icon: '🪄', name: 'Anggaran Otomatis', desc: 'Isi batas anggaran dari rata-rata pengeluaran 3 bulan terakhir.' },
  { icon: '📊', name: 'Ekspor Excel (CSV)', desc: 'Unduh seluruh transaksi untuk diolah di Excel.' },
];
