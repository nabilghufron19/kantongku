# Referensi API

Semua endpoint berada di `/api`, memakai JSON, dan (kecuali yang ditandai publik) membutuhkan cookie sesi `kantong_session`.
Kesalahan selalu berbentuk `{ "error": "pesan", "field": "nama_kolom (opsional)" }`.
Permintaan yang mengubah data harus berasal dari situs yang sama (pengecekan `Origin`).

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/health` | Publik. Status pengaturan: `databaseUrl`, `jwtSecret`, `database`, `schema` (termasuk kolom role dan tabel target). |
| GET | `/auth/config` | Publik. `{ registrationOpen, firstRun }`. |
| GET | `/auth/me` | `{ user }` terbaru (role, paket) untuk menyegarkan tampilan setelah admin mengubahnya. |
| POST | `/auth/register` | Publik. `{ username, password, name? }` → 201 + cookie. Terbuka untuk umum kecuali `ALLOW_REGISTER=false`. Akun pertama (atau `ADMIN_USERNAME`) menjadi admin; lainnya `user` berpaket `free`. |
| POST | `/auth/login` | Publik. `{ username, password }`. Dibatasi 10 gagal/15 menit per pengguna, 30 per IP. |
| POST | `/auth/logout` | Publik. Menghapus cookie. |
| GET | `/bootstrap` | `{ user, categories, transactions, budgets, goals, truncated }` (maks. 50.000 transaksi terbaru). `goals` hanya terisi untuk pengguna Pro. |
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

## Pengguna: bentuk objek `user`

`{ id, username, name, role: "admin"|"user", plan: "free"|"pro", proUntil: ISO|null, isPro }`.
`isPro` bernilai true untuk admin, atau Pro yang belum lewat `proUntil` (`null` = selamanya).

## Target tabungan (khusus Pro; selain itu HTTP 403 dengan `code: "pro_required"`)

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/goals` | Daftar target. |
| POST | `/goals` | `{ name, targetAmount, deadline?, icon?, color? }` → 201. Maks. 50 target. |
| PUT | `/goals/:id` | Isi sama seperti di atas. |
| POST | `/goals/:id/deposit` | `{ amount }` positif = setor, negatif = tarik. Tidak boleh membuat saldo target di bawah nol. |
| DELETE | `/goals/:id` | |

## Admin (khusus role admin; selain itu HTTP 403 dengan `code: "admin_required"`)

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/admin/users` | `{ users: [{ ..., txCount, createdAt, lastLoginAt }], stats: { users, admins, pro, new7, transactions } }`. |
| PATCH | `/admin/users/:id` | `{ role?: "admin"\|"user", plan?: "free"\|"pro", proDays?: 1-3650, lifetime?: true }`. Pro memperpanjang dari tanggal berakhir yang masih berlaku. Admin terakhir tidak bisa diturunkan. |
| POST | `/admin/users/:id/reset-password` | Mengembalikan `{ temporaryPassword }` (sekali tampil); semua sesi pengguna itu dicabut. |
| DELETE | `/admin/users/:id` | Tidak bisa diri sendiri atau admin terakhir. |
