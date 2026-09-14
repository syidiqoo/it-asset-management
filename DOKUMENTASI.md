# Dokumentasi Teknis — Aplikasi IT Asset Management

Dokumen ini menjelaskan **teknologi yang dipakai**, **peta konsep arsitektur Docker**, dan **struktur folder** aplikasi IT Asset Management.

Aplikasi ini adalah web app untuk mencatat dan mengelola aset IT kantor (Laptop, Phone, PC, Printer) dan SIM Card, lengkap dengan login, hak akses, upload gambar/dokumen, serta export & import data.

---

## 1. Teknologi yang dipakai

| Kategori | Teknologi | Versi | Keterangan |
| --- | --- | --- | --- |
| Framework | **Next.js** | 16.3.5 | App Router + Turbopack. Server Components & Server Actions. |
| UI runtime | **React** / React DOM | 19.2.8 | Library tampilan. |
| Bahasa | **TypeScript** | 5 | Seluruh kode ber-tipe. |
| Styling | **Tailwind CSS** | 4 | Via `@tailwindcss/postcss`; `app/globals.css` meng-import `tailwindcss`, `tw-animate-css`, dan `shadcn/tailwind.css`. |
| Styling tambahan | **tw-animate-css** | 1.4 | Animasi siap pakai. |
| Komponen UI | **shadcn/ui** | 4.21 | Gaya `base-nova`, komponen disimpan di `components/ui`. |
| Komponen dasar | **@base-ui/react** | 1.8 | Primitif UI (dialog, select, dropdown, dll). |
| Variasi kelas | **class-variance-authority** | 0.7 | Varian style komponen. |
| Helper kelas | **cn** | 0.3 | Penggabung kelas Tailwind (di-export lewat `lib/utils.ts`). |
| Ikon | **lucide-react** | 1.45 | Ikon antarmuka. |
| Database | **PostgreSQL** | — | Dijalankan sendiri (container Docker). |
| ORM | **Prisma** | 7.10 | `prisma` (CLI) + `@prisma/client`. |
| Driver DB | **@prisma/adapter-pg** + **pg** | 7.10 / 8.13 | Prisma 7 memakai driver adapter (Query Compiler). |
| Penyimpanan file | Filesystem (`data/uploads`) | — | Gambar & dokumen aset; di Docker disimpan di volume. |
| Autentikasi | **bcryptjs** | 3.0 | Hash & verifikasi password. |
| Validasi | **zod** | 4.6 | Validasi input form dan server action. |
| Export PDF | **jspdf** + **jspdf-autotable** | 4.2 / 5.0 | Membuat laporan PDF. |
| Export/Import CSV | modul internal | — | `lib/csv.ts` (tanpa library eksternal). |
| Environment | **dotenv** | 17.4 | Membaca file `.env` untuk Prisma CLI. |
| Seed runner | **tsx** | 4.23 | Menjalankan `prisma/seed.ts`. |
| Linter | **ESLint** + **eslint-config-next** | 9 / 16.3.5 | `npm run lint`. |
| Hosting | **Docker + Docker Compose** | — | Dijalankan di server sendiri (Ubuntu 22.04). |

**Catatan penting:** Prisma 7 memakai *Query Compiler*, jadi **driver adapter wajib** — di proyek ini memakai `@prisma/adapter-pg`. Database lokal berupa file (SQLite) **tidak dipakai lagi**.

---

## 2. Peta konsep (Docker)

Seluruh aplikasi berjalan sebagai **dua container** dalam satu Docker Compose, di server sendiri — tanpa layanan cloud (Vercel sudah tidak dipakai).

```
                    Pengguna (Browser)
            Admin / Guest  →  http://<IP-server>:3000
                            │  HTTP
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                Docker Compose  (1 host / 1 PC)                │
│                                                               │
│   ┌────────────────────┐             ┌────────────────────┐   │
│   │ app                │             │ db                 │   │
│   │ node:22 Next.js 16 │◄────SQL────►│ postgres:17-alpine │   │
│   │ SSR + Actions      │   :5432     │ database: itasset  │   │
│   └────────────────────┘             └────────────────────┘   │
│                                                               │
│      volume: uploads                 volume: pgdata           │
│      (gambar & dokumen)              (seluruh data DB)        │
└───────────────────────────────────────────────────────────────┘
```

**Alur utama**

| Alur | Rantai proses |
| --- | --- |
| Masuk (login) | Browser → `login-form` → Server Action `lib/actions/auth.ts` → cek `User` (bcrypt) → tulis `Session` di container `db` → set cookie httpOnly `session` |
| Buka halaman | `proxy.ts` cek cookie → tanpa sesi dialihkan ke `/login` → halaman membaca data lewat `lib/prisma.ts` ke container `db` |
| Simpan / ubah data | Form → Server Action di `lib/actions/` → validasi Zod (`lib/schemas.ts`) → tulis ke container `db` |
| Upload gambar / dokumen | Form aset → `lib/uploads.ts` (validasi) → tulis ke volume `uploads` → URL `/uploads/<file>` disimpan di kolom `imageUrl` / `docUrl` |
| Lihat lampiran | Browser → `/uploads/[...path]` → cek sesi → baca berkas dari volume `uploads` |
| Start container | `entrypoint.sh` → `prisma migrate deploy` ke container `db` → `next start` |
| Healthcheck | Docker memanggil `GET /api/health` di container `app` |

**Environment: build vs runtime**

| Tahap | `DATABASE_URL` | Keterangan |
| --- | --- | --- |
| Build image (stage `builder` di `Dockerfile`) | placeholder | `next build` meng-import modul route sehingga `lib/prisma.ts` membaca nilai ini; build **tidak** menyentuh database. |
| Runtime (`docker-compose.yml`) | asli | Dirakit dari `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` di `.env` host → `postgresql://…@db:5432/itasset`. |

**Persistensi data**

- Volume **`pgdata`** → seluruh data database.
- Volume **`uploads`** → gambar & dokumen aset.
- Keduanya bertahan saat image di-build ulang (`docker compose up -d --build`).

**Tidak lagi dipakai:** Vercel (hosting), Vercel Postgres (database), dan Vercel Blob (penyimpanan file) — semuanya digantikan oleh container di atas.

---

## 3. Struktur folder

```
app-tmp/
├─ app/                          # Routing (Next.js App Router)
│  ├─ layout.tsx                 # Root layout: font, metadata, skrip tema
│  ├─ globals.css                # Tailwind + variabel tema (terang/gelap)
│  ├─ loading.tsx                # Tampilan saat memuat
│  ├─ error.tsx                  # Halaman error
│  ├─ not-found.tsx              # Halaman 404
│  │
│  ├─ login/
│  │  ├─ page.tsx                # Halaman login (validasi sesi bila cookie ada)
│  │  └─ login-form.tsx          # Form login (client component)
│  │
│  ├─ (app)/                     # Grup route yang WAJIB login
│  │  ├─ layout.tsx              # Layout dalam aplikasi + sidebar
│  │  ├─ page.tsx                # Dashboard
│  │  ├─ assets/
│  │  │  ├─ page.tsx             # Daftar aset + pencarian, filter, export
│  │  │  ├─ new/page.tsx         # Form tambah aset
│  │  │  └─ [id]/
│  │  │     ├─ page.tsx          # Detail aset
│  │  │     └─ edit/page.tsx     # Form edit aset
│  │  ├─ sim-cards/page.tsx      # Inventaris SIM Card
│  │  ├─ sim-packages/page.tsx   # Master Package SIM
│  │  ├─ users/page.tsx          # Manajemen User
│  │  ├─ departments/page.tsx    # Struktur Department (bertingkat)
│  │  └─ types/page.tsx          # Kategori Inventaris
│  │
│  ├─ api/
│  │  ├─ assets/export/route.ts  # Endpoint export aset (CSV / JSON)
│  │  └─ health/route.ts         # Endpoint cek kesehatan (dipakai Docker)
│  └─ uploads/
│     └─ [...path]/route.ts      # Penyaji file upload (wajib login)
│
├─ components/                   # Komponen tampilan
│  ├─ ui/                        # Komponen dasar shadcn/ui
│  │  ├─ badge.tsx  button.tsx  card.tsx  dialog.tsx
│  │  ├─ dropdown-menu.tsx  input.tsx  label.tsx  select.tsx
│  │  └─ separator.tsx  table.tsx  textarea.tsx
│  ├─ sidebar.tsx                # Navigasi: sidebar desktop + header mobile
│  ├─ theme-toggle.tsx           # Tombol ganti tema terang/gelap
│  ├─ banner-hero.tsx            # Banner dashboard
│  ├─ asset-form.tsx             # Form tambah/edit aset
│  ├─ asset-export-menu.tsx      # Menu export (CSV/PDF)
│  ├─ asset-import-dialog.tsx    # Dialog import CSV
│  ├─ delete-asset-button.tsx    # Tombol hapus aset
│  ├─ master-data.tsx            # Tabel generik untuk data master
│  ├─ user-dialogs.tsx           # Dialog tambah/edit user
│  ├─ department-dialogs.tsx     # Dialog tambah/edit department
│  └─ sim-card-dialogs.tsx       # Dialog tambah/edit SIM Card
│
├─ lib/                          # Logika aplikasi (server-side & util)
│  ├─ actions/                   # Server Actions (proses simpan/hapus)
│  │  ├─ auth.ts                 # Login & logout
│  │  ├─ assets.ts               # Simpan / hapus aset
│  │  ├─ asset-import.ts         # Import aset dari CSV
│  │  ├─ users.ts                # Simpan / hapus user
│  │  ├─ departments.ts          # Simpan / hapus department
│  │  ├─ invent-types.ts         # Kategori inventaris
│  │  ├─ sim-cards.ts            # SIM Card
│  │  └─ sim-packages.ts         # Package SIM
│  ├─ prisma.ts                  # Koneksi database (Prisma + adapter PostgreSQL)
│  ├─ auth.ts                    # Sesi login, requireUser, requireAdmin
│  ├─ uploads.ts                 # Validasi & penyimpanan file (data/uploads)
│  ├─ schemas.ts                 # Skema validasi input (Zod)
│  ├─ constants.ts               # Konstanta (role, kondisi, ukuran halaman)
│  ├─ departments.ts             # Helper hirarki department (path, sub-department)
│  ├─ asset-filters.ts           # Parsing filter daftar aset
│  ├─ asset-export.ts            # Susunan kolom export aset
│  ├─ csv.ts                     # Baca / tulis berkas CSV
│  ├─ format.ts                  # Format tanggal
│  ├─ params.ts                  # Parsing parameter URL
│  ├─ rate-limit.ts              # Pembatas percobaan login
│  ├─ types.ts                   # Tipe state form / action
│  ├─ ui-classes.ts              # Kelas Tailwind yang dipakai berulang
│  └─ utils.ts                   # Re-export helper `cn`
│
├─ prisma/
│  ├─ schema.prisma              # Struktur database (model & relasi)
│  ├─ seed.ts                    # Data awal (akun, department, contoh aset)
│  └─ migrations/
│     ├─ 20260914000000_init/    # Migrasi awal PostgreSQL
│     └─ migration_lock.toml     # Penanda provider (postgresql)
│
├─ public/                       # Aset statis
│  └─ img/banner.jpg             # Gambar banner dashboard
├─ data/uploads/                 # Gambar & dokumen aset (di Docker: volume `uploads`)
│
├─ docker/
│  └─ entrypoint.sh              # Jalankan migrasi lalu start aplikasi
├─ Dockerfile                    # Image aplikasi
├─ docker-compose.yml            # Aplikasi + PostgreSQL + volume
├─ .dockerignore                 # Berkas yang tidak dikirim saat build image
│
├─ proxy.ts                      # Middleware: gerbang akses halaman (harus login)
├─ next.config.ts                # Konfigurasi Next.js (external package)
├─ prisma.config.ts              # Konfigurasi Prisma CLI (schema, seed, datasource)
├─ postcss.config.mjs            # Konfigurasi PostCSS (Tailwind)
├─ eslint.config.mjs             # Konfigurasi ESLint
├─ tsconfig.json                 # Konfigurasi TypeScript (alias `@/*`)
├─ components.json               # Konfigurasi shadcn/ui
├─ package.json                  # Dependency & perintah npm
├─ .env.example                  # Contoh environment variable (lokal)
├─ .env.docker.example           # Contoh environment variable (Docker/server)
├─ README.md                     # Cara menjalankan & deploy
├─ DEPLOY-SERVER.md              # Panduan deploy di server sendiri (Docker)
├─ PANDUAN.md                    # Panduan pemakaian aplikasi
└─ DOKUMENTASI.md                # Dokumen ini
```

> Catatan: `dev.db` di root adalah sisa dari versi lama (SQLite) dan sudah tidak dipakai — boleh dihapus.

---

## 4. Arsitektur singkat

**Routing & halaman**
- Memakai **App Router**. Route group `(app)` memuat semua halaman setelah login dan memakai `app/(app)/layout.tsx` (sidebar + area konten).
- `proxy.ts` (middleware) mengalihkan pengunjung tanpa cookie sesi ke `/login`.

**Autentikasi & hak akses**
- Password di-hash dengan **bcryptjs**.
- Sesi disimpan di tabel `Session`; token disimpan di cookie **httpOnly** bernama `session`.
- Role: `ADMIN` (kendali penuh), `GUEST` (hanya lihat), `NON_USER` (tidak bisa login).
- `requireUser()` dan `requireAdmin()` di `lib/auth.ts` menjaga halaman dan server action.

**Data**
- Semua akses database lewat `lib/prisma.ts` (Prisma Client + `@prisma/adapter-pg`).
- Perubahan data memakai **Server Actions** di `lib/actions/`, divalidasi dengan **Zod** (`lib/schemas.ts`).

**File (gambar & dokumen)**
- Disimpan di folder `data/uploads/` (bisa diubah lewat `UPLOAD_DIR`) lewat `lib/uploads.ts`. Di Docker folder ini di-mount ke volume `uploads`, jadi file tetap ada walau container di-build ulang.
- File disajikan lewat route `app/uploads/[...path]/route.ts`. `proxy.ts` mengalihkan pengunjung tanpa sesi ke `/login`, dan route-nya juga memvalidasi sesi (HTTP 401) sebagai lapisan kedua.
- Validasi: ukuran, ekstensi, MIME, dan tanda tangan file (signature).
- Batas: gambar 2 MB, dokumen 5 MB.

**Export & Import**
- Export CSV/JSON lewat `app/api/assets/export/route.ts`; export PDF memakai **jspdf** + **jspdf-autotable**.
- Import CSV diproses di `lib/actions/asset-import.ts` dengan parser di `lib/csv.ts`.

---

## 5. Environment variables

| Nama | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | Koneksi PostgreSQL. Di Docker diisi otomatis oleh `docker-compose.yml`. |
| `DIRECT_URL` | Opsional | Koneksi khusus migrasi, kalau berbeda dari `DATABASE_URL`. |
| `COOKIE_SECURE` | Opsional | `true`/`false` untuk cookie sesi lewat HTTPS. Default `true` saat production. |
| `UPLOAD_DIR` | Opsional | Lokasi folder penyimpanan upload. Default `data/uploads` (di Docker `/app/data/uploads`). |

Untuk Docker, variabel `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, dan `APP_PORT` diatur di file `.env` di server — lihat `.env.docker.example`.

---

## 6. Perintah npm

```bash
npm run dev         # Jalankan aplikasi (mode pengembangan)
npm run build       # generate Prisma client + build produksi
npm run start       # Jalankan hasil build produksi
npm run lint        # Periksa kode dengan ESLint

npm run db:migrate  # Buat/terapkan migrasi saat schema berubah (dev)
npm run db:deploy   # Terapkan migrasi yang sudah ada (produksi)
npm run db:seed     # Isi data awal
npm run db:studio   # Buka Prisma Studio
```

---

## 7. Model database

| Model | Keterangan |
| --- | --- |
| `Department` | Department/divisi, bisa bertingkat (sub-department) hingga 4 level. |
| `User` | Pengguna aplikasi dengan role `ADMIN` / `GUEST` / `NON_USER`. |
| `InventType` | Kategori inventaris (Laptop, Phone, PC, Printer). |
| `Asset` | Data aset IT beserta gambar, dokumen, dan status kondisi. |
| `SimPackage` | Master paket SIM. |
| `SimCard` | Data inventaris SIM Card. |
| `Session` | Sesi login (token disimpan di cookie httpOnly). |
