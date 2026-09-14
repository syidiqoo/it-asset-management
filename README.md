# Aplikasi IT Helpdesk Management

Aplikasi web untuk mencatat dan mengelola aset IT kantor (Laptop, Phone, PC, Printer).

Dibangun dengan **Next.js**, **PostgreSQL**, dan **Tailwind CSS + shadcn/ui** untuk tampilan. Dijalankan di server sendiri memakai **Docker**.

---

## Fitur

- **Login** dengan hak akses berbeda: **Admin** (kendali penuh), **Guest** (hanya melihat), dan **Non-user** (tanpa login).
- **Dashboard**: ringkasan jumlah aset, user, department, kategori inventaris, kondisi, dan aset terbaru.
- **Data Aset**: tabel lengkap + pencarian dan filter (department, kategori, kondisi). Tampil **100 baris per halaman** dengan navigasi panah kiri/kanan; klik baris untuk membuka detail serta tombol Edit/Hapus (Admin).
- **Export data aset** ke **CSV** atau **PDF** (mengikuti pencarian/filter yang sedang aktif).
- **Import data aset** dari file **CSV** (khusus Admin).
- **Tambah / Edit / Hapus aset** (khusus Admin) termasuk upload **Gambar** dan **Dokumen**.
- **Dropdown User mengikuti Department**: setelah memilih department, daftar user otomatis menyesuaikan.
- **Department bertingkat (sub-department)**: mis. `Operation > Base > Base Jakarta`.
- **User**, **Department**, dan **Kategori Inventaris**.
- **SIM Card**: inventaris SIM dengan kolom No Handphone, User, Department, Package, CLS Domestic, dan CLS Roaming (CLS = kredit pulsa per bulan).
- **Package SIM**: kelola daftar paket SIM (contoh: `Halo+`, `Enterprise Silver`, `Enterprise Diamond`).
- **Banner Dashboard**: gambar banner tetap (`public/img/banner.png`).
- Kolom **Updated By** terisi otomatis dari user yang sedang login.

Kolom data aset: `No, Kategori Inventaris, Asset Name, Code, Serial Number, User, Department, Condition, Image, Date, Doc, Purchase Date, Updated By, Note`.

---

## Yang perlu disiapkan

1. **Node.js** versi 20 ke atas (unduh di <https://nodejs.org>).
2. Terminal / Command Prompt.

Cek sudah terpasang dengan:

```bash
node -v
npm -v
```

---

## Cara Menjalankan (langkah demi langkah)

Buka terminal, lalu masuk ke folder proyek:

```bash
cd "G:\COMMAND CODE\untitled-project\app-tmp"
```

**1. Pasang semua kebutuhan aplikasi**

```bash
npm install
```

**2. Siapkan database PostgreSQL**

Aplikasi ini memerlukan database **PostgreSQL**. Untuk lokal, paling mudah menjalankannya lewat Docker:

```bash
docker run -d --name itasset-db \
  -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=itasset \
  -p 5432:5432 postgres:17-alpine
```

Untuk deploy di server, Postgres sudah disiapkan otomatis oleh `docker-compose.yml` — lihat [DEPLOY-SERVER.md](./DEPLOY-SERVER.md).

**3. Buat file pengaturan `.env`**

Salin `.env.example` menjadi `.env` di folder `app-tmp`:

```bash
cp .env.example .env
```

Isi file `.env`:

```
DATABASE_URL="postgresql://postgres:secret@localhost:5432/itasset"
COOKIE_SECURE=false
```

> `DATABASE_URL` adalah koneksi ke database PostgreSQL. Untuk lokal contohnya `postgresql://postgres:secret@localhost:5432/itasset`.

**4. Terapkan struktur database & isi data awal**

```bash
npm run db:migrate   # terapkan migrasi (mode pengembangan)
npm run db:seed      # isi akun, department, kategori, contoh aset
```

**5. Jalankan aplikasi**

```bash
npm run dev
```

Buka browser ke <http://localhost:3000>.

Untuk menghentikan aplikasi: tekan `Ctrl + C` di terminal.

---

## Akun untuk masuk

| Peran | Username | Password | Hak akses |
| --- | --- | --- | --- |
| Admin | `admin` | `admin123` | Semua fitur (tambah/edit/hapus & kelola master data) |
| Guest | `guest` | `guest123` | Hanya melihat data |

Selain itu ada user contoh di setiap department (mis. `budi`, `siti`, `dewi`) dengan password `password123`. Ada juga staf sub-department contoh `rudi` (role Non-user, **tidak bisa login**) di `Operations > Base > Base Jakarta`.

---

## Struktur Department & Role

Department bisa **bertingkat** (sub-department), contoh:

```
Operations > Base > Base Jakarta
```

Aturan role mengikuti level department:

| Level | Role yang boleh | Bisa login? |
| --- | --- | --- |
| Department (level atas), mis. `IT`, `Management` | `Admin`, `Guest` | Ya |
| Department level atas lain (mis. `HR`, `Finance`) | `Guest` | Ya |
| Sub-department (mis. `Base`, `Base Jakarta`) | `Non-user` | Tidak |

- **Admin** hanya boleh ditempatkan di department yang ditandai **"Boleh ada admin"** (lihat halaman **Department**, mis. `IT` dan `Management`). Kamu bisa menyalakan tanda ini di department lain bila perlu.
- **Non-user** adalah orang yang tercatat sebagai pemegang aset tetapi tidak punya akses login (mis. staf di `Base Jakarta`).
- **Maksimal 4 level**: setelah level 4 (mis. `Tello`) tidak bisa ditambah sub-department lagi, supaya path tetap pendek dan rapi.
- Department yang masih punya sub-department / user / aset tidak bisa dihapus.

---

## Halaman Aplikasi

| Alamat | Keterangan |
| --- | --- |
| `/login` | Halaman masuk |
| `/` | Dashboard |
| `/assets` | Daftar aset |
| `/assets/new` | Form tambah aset (Admin) |
| `/assets/[id]` | Detail aset |
| `/assets/[id]/edit` | Form edit aset (Admin) |
| `/sim-cards` | Inventaris SIM Card (Admin bisa tambah/edit/hapus) |
| `/sim-packages` | Kelola package SIM (Admin) |
| `/users` | User (aksi hanya untuk Admin) |
| `/departments` | Department: kelola struktur, base, unit (Admin) |
| `/types` | Kelola kategori inventaris (Admin) |

---

## Perintah Berguna

```bash
npm run dev         # jalankan aplikasi (mode pengembangan)
npm run build       # generate Prisma client lalu bangun versi produksi
npm run db:migrate  # buat/terapkan migrasi saat mengubah schema (dev)
npm run db:deploy   # terapkan migrasi tanpa membuat migrasi baru (produksi)
npm run db:seed     # isi ulang data awal
npm run db:studio   # buka Prisma Studio untuk melihat isi database
```

---

## Deploy di Server Sendiri (Docker)

Aplikasi ini dijalankan di server sendiri memakai **Docker Compose**: satu container untuk aplikasi Next.js, satu container untuk **PostgreSQL**, ditambah Docker volume untuk menyimpan file upload.

Panduan lengkap ada di **[DEPLOY-SERVER.md](./DEPLOY-SERVER.md)** — mulai dari memasang Docker di Ubuntu 22.04, menyiapkan `.env`, build, seed, backup, sampai HTTPS.

Ringkasnya, setelah Docker terpasang:

```bash
cp .env.docker.example .env                  # lalu isi POSTGRES_PASSWORD dll.
docker compose up -d --build                 # build + jalankan (migrasi otomatis)
docker compose exec app npx prisma db seed   # isi data awal, sekali saja
```

Aplikasi bisa diakses di `http://IP-SERVER:3000`.

> Aplikasi ini **tidak lagi memakai Vercel**. Database dan penyimpanan file berjalan sendiri di server, sehingga Vercel Blob dan Vercel Postgres sudah tidak dipakai.

---

## Struktur Folder Singkat

```
app-tmp/
├─ app/
│  ├─ api/assets/export/ # unduhan data aset (CSV/JSON)
│  ├─ api/health/       # endpoint cek kesehatan (dipakai Docker)
│  ├─ uploads/          # penyaji file upload (wajib login)
│  ├─ login/            # halaman login
│  └─ (app)/            # halaman setelah login (dashboard, aset, user, dll)
├─ components/          # komponen tampilan (form, tabel, sidebar, dialog)
├─ lib/
│  ├─ actions/          # proses simpan/hapus data (server actions)
│  ├─ asset-export.ts   # susunan kolom export aset
│  ├─ asset-filters.ts  # parsing filter daftar aset
│  ├─ auth.ts           # logika login & sesi
│  ├─ constants.ts      # konstanta bersama (role, kondisi, ukuran halaman)
│  ├─ csv.ts            # baca/tulis berkas CSV
│  ├─ departments.ts    # helper hirarki department (path, sub-department)
│  ├─ format.ts         # format tanggal
│  ├─ params.ts         # parsing parameter URL
│  ├─ prisma.ts         # koneksi database (Prisma + adapter PostgreSQL)
│  ├─ rate-limit.ts     # pembatas percobaan login
│  ├─ schemas.ts        # skema validasi input (Zod)
│  ├─ types.ts          # tipe state form/action
│  ├─ ui-classes.ts     # kelas Tailwind yang dipakai berulang
│  ├─ uploads.ts        # validasi & penyimpanan file (folder data/uploads)
│  └─ utils.ts          # helper `cn` untuk kelas Tailwind
├─ prisma/
│  ├─ migrations/       # migrasi database PostgreSQL
│  ├─ schema.prisma     # struktur database
│  └─ seed.ts           # data awal
├─ data/uploads/        # gambar & dokumen aset (di Docker: volume `uploads`)
├─ docker/
│  └─ entrypoint.sh     # jalankan migrasi lalu start aplikasi
├─ Dockerfile           # image aplikasi
├─ docker-compose.yml   # aplikasi + PostgreSQL + volume
└─ proxy.ts             # pengatur akses halaman (harus login dulu)
```

---

## Catatan

- **Aturan upload**: gambar maksimal **2 MB** (PNG, JPG, WEBP, GIF) dan dokumen maksimal **5 MB** (PDF, DOC, DOCX, XLS, XLSX, TXT). File yang tidak sesuai akan ditolak.
- **Password** minimal **8 karakter** saat membuat atau mengganti password user.
- **Penyimpanan file**: gambar & dokumen disimpan di folder `data/uploads/` (bisa diubah lewat `UPLOAD_DIR`; di Docker memakai volume `uploads`, jadi tidak hilang saat build ulang). File disajikan lewat route `/uploads/...` yang **wajib login**, dan file lama otomatis dihapus saat diganti atau asetnya dihapus.
- **Login dibatasi** 5 kali gagal per 15 menit untuk mencegah percobaan berulang.
- **Mengubah struktur database**: edit `prisma/schema.prisma`, lalu jalankan `npm run db:migrate` (lokal) dan `npm run db:deploy` (produksi).
- **Mereset data**: jalankan ulang `npm run db:seed` (seed bersifat upsert), atau buat database baru lalu jalankan `npm run db:deploy` dan `npm run db:seed`.
- **Ganti password admin**: login sebagai admin, buka menu **User**, klik ikon pensil pada user `admin`.
- **Export**: tombol **Export** di halaman **Data Aset** menghasilkan berkas **CSV** dan **PDF** sesuai pencarian/filter yang sedang aktif. Export tersedia untuk semua user yang sudah login.
- **Import CSV** (khusus Admin): unduh contoh format lewat **Export → Export CSV**, lalu isi datanya. Kolom yang dibutuhkan: `Kategori Inventaris, Asset Name, Code, Serial Number, User (atau Username), Department, Condition, Date, Purchase Date, Note`. `Kategori Inventaris`, `Department`, dan `User` harus sudah terdaftar di aplikasi (tidak dibuat otomatis). Header lama (`Invent Type`, `Jenis Inventaris`, `Jenis`) tetap diterima. Kolom `Department` boleh diisi **path lengkap** (mis. `Operations > Base > Base Jakarta`) atau nama department; kolom `User` boleh nama user atau `Username`. `Code` harus unik, `Date`/`Purchase Date` dapat ditulis `YYYY-MM-DD` atau `DD/MM/YYYY`. Jika ada satu baris bermasalah, seluruh import dibatalkan agar data tetap konsisten. Maksimal 1000 baris dan 2 MB per berkas.
