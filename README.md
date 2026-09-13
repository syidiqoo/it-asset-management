# Aplikasi IT Asset Management

Aplikasi web untuk mencatat dan mengelola aset IT kantor (Laptop, Phone, PC, Printer).

Dibangun dengan **Next.js**, **SQLite** (database berupa satu file di komputer), dan **Tailwind CSS + shadcn/ui** untuk tampilan.

---

## Fitur

- **Login** dengan hak akses berbeda: **Admin** (kendali penuh), **Guest** (hanya melihat), dan **Non-user** (tanpa login).
- **Dashboard**: ringkasan jumlah aset, user, department, kategori inventaris, kondisi, dan aset terbaru.
- **Data Aset**: tabel lengkap + pencarian, filter (department, kategori, kondisi), dan halaman detail.
- **Export data aset** ke **CSV** atau **PDF** (mengikuti pencarian/filter yang sedang aktif).
- **Import data aset** dari file **CSV** (khusus Admin).
- **Tambah / Edit / Hapus aset** (khusus Admin) termasuk upload **Gambar** dan **Dokumen**.
- **Dropdown User mengikuti Department**: setelah memilih department, daftar user otomatis menyesuaikan.
- **Department bertingkat (sub-department)**: mis. `Operation > Base > Base Jakarta`.
- **User**, **Department**, dan **Kategori Inventaris**.
- **SIM Card**: inventaris SIM dengan kolom No Handphone, User, Department, Package, CLS Domestic, dan CLS Roaming (CLS = kredit pulsa per bulan).
- **Package SIM**: kelola daftar paket SIM (contoh: `Halo+`, `Enterprise Silver`, `Enterprise Diamond`).
- **Banner Dashboard**: gambar banner tetap (`public/img/banner.jpg`).
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

**2. Buat file pengaturan `.env`**

Salin `.env.example` menjadi `.env` di folder `app-tmp`:

```bash
cp .env.example .env
```

Isi file `.env`:

```
DATABASE_URL="file:./dev.db"
```

> `DATABASE_URL` menentukan lokasi file database.

**3. Siapkan database**

```bash
npm run db:migrate
```

**4. Isi data awal (akun, department, kategori, contoh aset)**

```bash
npm run db:seed
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
npm run build       # cek & bangun versi produksi
npm run db:migrate  # terapkan perubahan struktur database
npm run db:seed     # isi ulang data awal
npm run db:studio   # buka Prisma Studio untuk melihat isi database
```

---

## Struktur Folder Singkat

```
app-tmp/
├─ app/
│  ├─ api/assets/export/ # unduhan data aset (CSV/JSON)
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
│  ├─ prisma.ts         # koneksi database
│  ├─ rate-limit.ts     # pembatas percobaan login
│  ├─ schemas.ts        # skema validasi input (Zod)
│  ├─ types.ts          # tipe state form/action
│  ├─ ui-classes.ts     # kelas Tailwind yang dipakai berulang
│  ├─ uploads.ts        # validasi & penyimpanan file
│  └─ utils.ts          # helper `cn` untuk kelas Tailwind
├─ prisma/
│  ├─ schema.prisma     # struktur database
│  └─ seed.ts           # data awal
├─ public/uploads/      # tempat file gambar & dokumen hasil upload
├─ dev.db               # file database SQLite
└─ proxy.ts             # pengatur akses halaman (harus login dulu)
```

---

## Catatan

- **Aturan upload**: gambar maksimal **2 MB** (PNG, JPG, WEBP, GIF) dan dokumen maksimal **5 MB** (PDF, DOC, DOCX, XLS, XLSX, TXT). File yang tidak sesuai akan ditolak.
- **Password** minimal **8 karakter** saat membuat atau mengganti password user.
- **Akses file**: file di `public/uploads/` hanya dapat dibuka setelah login, dan file lama otomatis dihapus saat diganti atau asetnya dihapus.
- **Login dibatasi** 5 kali gagal per 15 menit untuk mencegah percobaan berulang.
- **Mengubah struktur database**: edit `prisma/schema.prisma`, lalu jalankan `npm run db:migrate`.
- **Mereset data**: hapus file `dev.db`, lalu jalankan ulang `npm run db:migrate` dan `npm run db:seed`.
- **Ganti password admin**: login sebagai admin, buka menu **User**, klik ikon pensil pada user `admin`.
- File gambar & dokumen disimpan di folder `public/uploads/` dan tidak ikut masuk ke Git.
- **Export**: tombol **Export** di halaman **Data Aset** menghasilkan berkas **CSV** dan **PDF** sesuai pencarian/filter yang sedang aktif. Export tersedia untuk semua user yang sudah login.
- **Import CSV** (khusus Admin): unduh contoh format lewat **Export → Export CSV**, lalu isi datanya. Kolom yang dibutuhkan: `Kategori Inventaris, Asset Name, Code, Serial Number, User (atau Username), Department, Condition, Date, Purchase Date, Note`. `Kategori Inventaris`, `Department`, dan `User` harus sudah terdaftar di aplikasi (tidak dibuat otomatis). Header lama (`Invent Type`, `Jenis Inventaris`, `Jenis`) tetap diterima. Kolom `Department` boleh diisi **path lengkap** (mis. `Operations > Base > Base Jakarta`) atau nama department; kolom `User` boleh nama user atau `Username`. `Code` harus unik, `Date`/`Purchase Date` dapat ditulis `YYYY-MM-DD` atau `DD/MM/YYYY`. Jika ada satu baris bermasalah, seluruh import dibatalkan agar data tetap konsisten. Maksimal 1000 baris dan 2 MB per berkas.
