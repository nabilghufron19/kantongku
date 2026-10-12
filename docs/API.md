# Referensi API

Semua endpoint berada di `/api`, memakai JSON, dan (kecuali yang ditandai publik) membutuhkan cookie sesi `kantong_session`.
Kesalahan selalu berbentuk `{ "error": "pesan", "field": "nama_kolom (opsional)" }`.
Permintaan yang mengubah data harus berasal dari situs yang sama (pengecekan `Origin`).

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/health` | Publik. Status pengaturan: `databaseUrl`, `jwtSecret`, `database`, `schema`. |
| GET | `/auth/config` | Publik. `{ registrationOpen, firstRun }`. |
| POST | `/auth/register` | Publik. `{ username, password, name? }` → 201 + cookie. Hanya akun pertama, atau jika `ALLOW_REGISTER=true`. |
| POST | `/auth/login` | Publik. `{ username, password }`. Dibatasi 10 gagal/15 menit per pengguna, 30 per IP. |
| POST | `/auth/logout` | Publik. Menghapus cookie. |
| GET | `/bootstrap` | `{ user, categories, transactions, budgets, truncated }` (maks. 50.000 transaksi terbaru). |
| POST | `/transactions` | `{ type, amount, date, categoryId, method?, note?, id? }` → 201. `id` opsional (UUID) untuk memulihkan transaksi. |
| PUT | `/transactions/:id` | Isi sama seperti di atas. |
| DELETE | `/transactions/:id` | |
| POST | `/categories` | `{ name, icon, color, type }` → 201. Nama unik per jenis (tak peka huruf besar/kecil). |
| PUT | `/categories/:id` | `{ name, icon, color }`. |
| DELETE | `/categories/:id` | Transaksinya dipindah ke kategori bawaan. Mengembalikan `{ moved, movedTo }`. Kategori bawaan tidak bisa dihapus. |
| PUT | `/budgets/:categoryId` | `{ amount }`, 0 = hapus batas. Hanya kategori pengeluaran. |
| PUT | `/budgets` | `{ budgets: { "<categoryId>": jumlah } }` mengganti seluruh anggaran. |
| GET | `/data/export` | Cadangan JSON (format v2). |
| POST | `/data/import` | `{ mode: "merge" \| "replace", data }`. Menerima format v2 dan cadangan lama (v1) dari index.html tunggal. |
| DELETE | `/data` | Hapus semua transaksi dan anggaran (kategori tetap). |
| PATCH | `/account` | `{ name }`. |
| PUT | `/account/password` | `{ currentPassword, newPassword }`. Sesi perangkat lain dicabut. |
| DELETE | `/account` | `{ password }`. Menghapus akun dan seluruh datanya. |

Jumlah uang adalah bilangan bulat rupiah (maks. 999.999.999.999). Tanggal berformat `YYYY-MM-DD`.
