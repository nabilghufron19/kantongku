# Kantong

Aplikasi catatan keuangan pribadi: pemasukan, pengeluaran, anggaran per kategori, grafik bulanan, ekspor/impor.
Data tersimpan di **Neon (PostgreSQL)**, dilayani oleh **Cloudflare Pages + Pages Functions**, kode di **GitHub**.
Tanpa framework dan tanpa langkah build: frontend adalah modul JavaScript biasa.

## Fitur

**Untuk semua pengguna (gratis)**
- Daftar dan masuk, atau coba **akun demo** (data contoh pemakaian sebulan, tanpa mendaftar)
- Catat pengeluaran dan pemasukan, ubah, hapus, dan batalkan hapus
- Ringkasan bulanan: sisa uang, total saldo, donat per kategori, batang harian, proyeksi akhir bulan
- Anggaran per kategori dengan peringatan 80% dan lewat batas
- Kategori sendiri; cadangan JSON, impor (gabungkan atau ganti)
- Tema terang/gelap; nyaman di ponsel (navigasi bawah, dialog dari bawah layar, ketuk baris untuk mengubah)

**Fitur Pro** (terkunci dengan watermark PRO untuk akun gratis; upgrade lewat WhatsApp)
- Laporan & Tren: grafik 3/6/12 bulan, kategori terbesar, pola hari boros, wawasan otomatis, cetak PDF
- Target Tabungan: setor, tarik, dan hitungan "sisihkan per bulan" menuju tenggat
- Saldo per Dompet (tunai, bank, e-wallet)
- Anggaran Otomatis dari rata-rata 3 bulan, dan Ekspor Excel (CSV)

**Admin**
- Panel Admin: daftar pengguna, statistik, ubah role (admin/pengguna), aktifkan Pro (+1 bulan, +3 bulan, +1 tahun, selamanya) atau kembalikan ke Gratis, reset kata sandi, hapus pengguna
- Pengaman: admin terakhir tidak bisa diturunkan atau dihapus

## Struktur proyek

```
kantong/
├─ public/                 Situs statis (output Cloudflare Pages)
│  ├─ index.html           Kerangka halaman dan dialog
│  ├─ _headers             Header keamanan (CSP, X-Frame-Options, dll.)
│  └─ assets/
│     ├─ css/app.css
│     └─ js/
│        ├─ config.js      Nomor WhatsApp upgrade, nama merek, daftar fitur Pro  <- ubah di sini
│        ├─ main.js api.js store.js dialogs.js ui.js charts.js util.js view.js
│        ├─ demo.js        Akun demo: data contoh sebulan + "server" mini di browser
│        └─ views/         dashboard, transactions, budgets, report, goals, admin, settings, auth, prolock
├─ functions/api/          Endpoint (Cloudflare Pages Functions, satu berkas per rute)
│  ├─ _middleware.js       Cek asal (CSRF), koneksi DB, login, dan penjaga /api/admin
│  ├─ auth/ account/ transactions/ categories/ budgets/ data/ goals/ admin/
│  └─ bootstrap.js health.js
├─ src/server/             Logika server yang dipakai endpoint
│  ├─ auth.js session.js ratelimit.js validate.js http.js db.js defaults.js importer.js
│  ├─ plan.js              Aturan role dan paket Pro (isProUser, requirePro, requireAdmin)
│  └─ repo/                Seluruh SQL (users, categories, transactions, budgets, goals, admin, data)
├─ db/schema.sql           Skema database (aman dijalankan berulang, termasuk pembaruan v2)
├─ scripts/                migrate, reset-password, smoke (uji asap)
├─ tests/                  Uji otomatis (node --test)
├─ docs/API.md             Referensi endpoint
└─ .github/workflows/ci.yml
```

Semua tabel berawalan `kt_` sehingga aman berbagi database dengan proyek lain.

## Deploy (semua bisa dari browser, tanpa Node di komputer)

### 1. Neon: siapkan database

1. Masuk ke [neon.tech](https://neon.tech), buat project baru (disarankan terpisah dari proyek lain), region Singapore.
2. Di dasbor project, klik **Connect** dan salin *connection string* (pilih yang **pooled**). Bentuknya `postgresql://...neon.tech/neondb?sslmode=require`.
3. Buka **SQL Editor**, tempel seluruh isi `db/schema.sql`, klik **Run**. Hasilnya enam tabel `kt_*`.

> **Memperbarui dari versi sebelumnya (tanpa role/Pro)?** Jalankan `db/schema.sql` sekali lagi di SQL Editor. File ini aman diulang: menambah kolom baru dan tabel target tabungan tanpa menghapus data, dan menjadikan akun tertua sebagai admin jika belum ada admin. Lakukan ini **sebelum** kode baru ter-deploy, atau segera sesudahnya (cek `/api/health`).

### 2. GitHub: unggah kode

1. Buat repository baru (disarankan **Private**), misalnya `kantong`.
2. **Add file → Upload files**, seret seluruh isi folder proyek (termasuk folder `.github` jika ikut terbawa), lalu **Commit changes**.
3. Jangan mengunggah `.dev.vars` atau `node_modules` (sudah masuk `.gitignore`).

### 3. Cloudflare Pages: sambungkan ke GitHub

1. **Workers & Pages → Create → Pages → Connect to Git**, pilih repository `kantong`.
2. Isian build:
   - Framework preset: **None**
   - Build command: `npm install`
   - Build output directory: `public`
3. Buka **Environment variables** dan tambahkan (Production):

   | Nama | Nilai |
   |---|---|
   | `DATABASE_URL` | connection string Neon dari langkah 1 (jadikan **Secret/Encrypt**) |
   | `JWT_SECRET` | string acak minimal 16 karakter (Secret) |
   | `ADMIN_USERNAME` | *(disarankan)* nama pengguna yang otomatis menjadi admin saat mendaftar. Jika kosong, **akun pertama** yang mendaftar menjadi admin |
   | `ALLOW_REGISTER` | *(opsional)* `false` untuk menutup pendaftaran akun baru (default: terbuka) |

   `JWT_SECRET` bisa dibuat dengan mengetik kata acak yang panjang, atau menjalankan `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`.
4. **Save and Deploy**. Setiap kali Anda memperbarui file di GitHub, Cloudflare otomatis men-deploy ulang.

### 4. Pemeriksaan pertama

1. Buka `https://NAMA-PROYEK.pages.dev/api/health`. Semua nilai harus `true`:
   `databaseUrl`, `jwtSecret`, `database`, `schema`. Jika ada yang `false`, perbaiki bagian yang sesuai.
2. Buka halaman utama dan **daftar sekarang**. Akun pertama otomatis menjadi **admin** (atau akun dengan nama pengguna `ADMIN_USERNAME` jika variabel itu diisi). Pendaftaran terbuka untuk umum sesudahnya, dan pengguna baru berstatus Gratis. Segera daftar setelah deploy; mengisi `ADMIN_USERNAME` mencegah orang lain merebut peran admin.
3. Opsional, jika Node terpasang: `BASE_URL=https://NAMA-PROYEK.pages.dev SMOKE_USER=... SMOKE_PASS=... npm run smoke` menguji seluruh alur API.

## Role, paket Pro, dan akun demo

**Role.** `admin` dan `user`. Admin membuka tab **Admin** (hanya muncul untuk admin) untuk mengatur pengguna. Admin otomatis memiliki semua fitur Pro.

**Paket.** Pengguna baru berstatus **Gratis**. Fitur Pro tampil sebagai pratinjau berwatermark "PRO" dengan tombol upgrade. Alur upgrade:
1. Pengguna menekan **Upgrade via WhatsApp** (pesan otomatis memuat nama penggunanya) dan membayar sesuai kesepakatan.
2. Admin membuka **Admin → Kelola** pada pengguna itu, lalu menekan **Pro +1 bulan / +3 bulan / +1 tahun / selamanya**. Perpanjangan dihitung dari tanggal berakhir yang masih berlaku.
3. Fitur terbuka otomatis; pengguna cukup kembali ke tab aplikasi (atau muat ulang). Saat masa Pro habis, akun kembali Gratis tanpa data hilang.

Nomor WhatsApp, nama merek, dan daftar fitur Pro ada di satu berkas: `public/assets/js/config.js`.

**Akun demo.** Tombol "Coba akun demo" di layar masuk membuka aplikasi dengan data contoh pemakaian sebulan dan semua fitur Pro terbuka. Seluruhnya berjalan di browser pengunjung: tidak menyentuh database, tidak membuat akun, dan semua perubahan hilang saat halaman ditutup. Aman dari pengunjung yang saling mengubah data.

**Batas pengamanan fitur Pro.** Target Tabungan dan semua endpoint admin dijaga di **server** (HTTP 403 bila tidak berhak). Laporan, Saldo per Dompet, CSV, dan Anggaran Otomatis dihitung di browser dari data milik pengguna sendiri, sehingga penguncinya berada di tampilan. Itu sudah cukup untuk pemakaian wajar, tetapi pengguna yang mahir secara teknis bisa mengakalinya.

## Pengembangan lokal (opsional)

```bash
npm install
cp .dev.vars.example .dev.vars     # isi DATABASE_URL dan JWT_SECRET
npm run db:migrate                 # menjalankan db/schema.sql
npm run dev                        # http://localhost:8788
npm test                           # uji otomatis
```

Gunakan *branch* Neon terpisah (mis. `dev`) untuk pengembangan agar data asli aman.

## Keamanan

- Kata sandi di-hash PBKDF2-SHA256 (100.000 iterasi, batas Cloudflare Workers) dengan salt acak.
- Sesi berupa JWT HS256 di cookie `HttpOnly`, `SameSite=Lax`, dan `Secure` di HTTPS. Mengganti kata sandi mencabut semua sesi lama.
- Percobaan masuk dibatasi: 10 gagal per nama pengguna dan 30 per IP dalam 15 menit.
- Perlindungan CSRF: permintaan pengubah data dengan `Origin` asing ditolak.
- Setiap query SQL dibatasi `user_id` sesi dan memakai parameter (tanpa penyambungan string). Jenis transaksi dijaga oleh *foreign key* ke kategorinya.
- CSP ketat di `public/_headers`: hanya skrip dari domain sendiri, tanpa skrip inline.
- Pesan kesalahan internal tidak dibocorkan ke klien.

## Mengatasi masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Layar "Kantong belum bisa dibuka": `DATABASE_URL belum diatur` | Tambahkan variabel di Cloudflare Pages → Settings → Variables and Secrets, lalu deploy ulang. |
| `/api/health` menunjukkan `schema: false` | `db/schema.sql` belum dijalankan di database yang dipakai `DATABASE_URL`. |
| Build gagal: `Could not resolve "@neondatabase/serverless"` | Pastikan Build command berisi `npm install`. |
| Daftar/masuk gagal dengan galat CPU (Exceeded CPU) | Paket gratis Workers membatasi waktu CPU. Tambahkan variabel `PBKDF2_ITERATIONS` bernilai lebih kecil (mis. `50000`) hanya untuk akun yang dibuat sesudahnya, atau gunakan paket berbayar. Hash lama tetap valid. |
| "Pendaftaran sedang ditutup" | `ALLOW_REGISTER` bernilai `false`. Hapus variabel itu atau ubah menjadi `true`. |
| Login gagal setelah update, `/api/health` menunjukkan `schema: false` | `db/schema.sql` versi terbaru belum dijalankan di Neon (kolom `role`/tabel `kt_goals` belum ada). |
| Lupa kata sandi | Dari komputer ber-Node: `npm run user:reset -- nama_pengguna sandi_baru` (butuh `.dev.vars`). |
| Cadangan lama dari versi `index.html` tunggal | Pengaturan → Impor dan gabungkan; format lama dikenali otomatis. |

## Skala

Aplikasi memuat transaksi (maksimal 50.000 terbaru) sekali saat dibuka, lalu menghitung ringkasan di peramban. Ini sangat memadai untuk pemakaian pribadi bertahun-tahun. Bila kelak ratusan ribu baris, ringkasan perlu dipindah ke query agregat di server.

---
Powered by Nabil Ghufron 2026
