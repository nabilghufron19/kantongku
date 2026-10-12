# Kantong

Aplikasi catatan keuangan pribadi: pemasukan, pengeluaran, anggaran per kategori, grafik bulanan, ekspor/impor.
Data tersimpan di **Neon (PostgreSQL)**, dilayani oleh **Cloudflare Pages + Pages Functions**, kode di **GitHub**.
Tanpa framework dan tanpa langkah build: frontend adalah modul JavaScript biasa.

## Fitur

- Akun dengan nama pengguna dan kata sandi (hash PBKDF2, sesi cookie HttpOnly, anti tebak sandi)
- Catat pengeluaran dan pemasukan, ubah, hapus, dan batalkan hapus
- Ringkasan bulanan: sisa uang, total saldo, donat per kategori, batang harian, proyeksi akhir bulan
- Anggaran per kategori dengan peringatan 80% dan lewat batas, plus isian otomatis dari rata-rata 3 bulan
- Kategori sendiri (ikon dan warna); menghapus kategori memindahkan transaksinya ke kategori bawaan
- Cadangan JSON, impor (gabungkan atau ganti), ekspor CSV untuk Excel
- Tema terang/gelap, tampilan nyaman di komputer maupun layar kecil

## Struktur proyek

```
kantong/
├─ public/                 Situs statis (output Cloudflare Pages)
│  ├─ index.html           Kerangka halaman dan dialog
│  ├─ _headers             Header keamanan (CSP, X-Frame-Options, dll.)
│  └─ assets/
│     ├─ css/app.css
│     └─ js/               main.js, api.js, store.js, dialogs.js, ui.js, charts.js, util.js, view.js
│        └─ views/         dashboard, transactions, budgets, settings, auth
├─ functions/api/          Endpoint (Cloudflare Pages Functions, satu berkas per rute)
│  └─ _middleware.js       Cek asal permintaan (CSRF), koneksi DB, dan login
├─ src/server/             Logika server yang dipakai endpoint
│  ├─ auth.js session.js ratelimit.js validate.js http.js db.js defaults.js importer.js
│  └─ repo/                Seluruh SQL (users, categories, transactions, budgets, data)
├─ db/schema.sql           Skema database (aman dijalankan berulang)
├─ scripts/                migrate, reset-password, smoke (uji asap)
├─ tests/                  Uji otomatis (node --test)
├─ docs/API.md             Referensi endpoint
└─ .github/workflows/ci.yml
```

Semua tabel berawalan `kt_` sehingga aman berbagi database dengan proyek lain (misalnya tabel `users` milik aplikasi lain tidak tersentuh).

## Deploy (semua bisa dari browser, tanpa Node di komputer)

### 1. Neon: siapkan database

1. Masuk ke [neon.tech](https://neon.tech), buat project baru (disarankan terpisah dari proyek lain), region Singapore.
2. Di dasbor project, klik **Connect** dan salin *connection string* (pilih yang **pooled**). Bentuknya `postgresql://...neon.tech/neondb?sslmode=require`.
3. Buka **SQL Editor**, tempel seluruh isi `db/schema.sql`, klik **Run**. Hasilnya lima tabel `kt_*`.

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
   | `ALLOW_REGISTER` | *(opsional)* `true` jika ingin akun lain boleh mendaftar |

   `JWT_SECRET` bisa dibuat dengan mengetik kata acak yang panjang, atau menjalankan `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`.
4. **Save and Deploy**. Setiap kali Anda memperbarui file di GitHub, Cloudflare otomatis men-deploy ulang.

### 4. Pemeriksaan pertama

1. Buka `https://NAMA-PROYEK.pages.dev/api/health`. Semua nilai harus `true`:
   `databaseUrl`, `jwtSecret`, `database`, `schema`. Jika ada yang `false`, perbaiki bagian yang sesuai.
2. Buka halaman utama dan **daftar sekarang**. Akun pertama otomatis menjadi pemilik, lalu pendaftaran ditutup (kecuali `ALLOW_REGISTER=true`). Segera daftar setelah deploy: siapa pun yang mendaftar lebih dulu menjadi pemilik.
3. Opsional, jika Node terpasang: `BASE_URL=https://NAMA-PROYEK.pages.dev SMOKE_USER=... SMOKE_PASS=... npm run smoke` menguji seluruh alur API.

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
| "Pendaftaran ditutup" | Sudah ada akun pertama. Setel `ALLOW_REGISTER=true` bila ingin menambah akun. |
| Lupa kata sandi | Dari komputer ber-Node: `npm run user:reset -- nama_pengguna sandi_baru` (butuh `.dev.vars`). |
| Cadangan lama dari versi `index.html` tunggal | Pengaturan → Impor dan gabungkan; format lama dikenali otomatis. |

## Skala

Aplikasi memuat transaksi (maksimal 50.000 terbaru) sekali saat dibuka, lalu menghitung ringkasan di peramban. Ini sangat memadai untuk pemakaian pribadi bertahun-tahun. Bila kelak ratusan ribu baris, ringkasan perlu dipindah ke query agregat di server.
