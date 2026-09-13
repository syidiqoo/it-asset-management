# Panduan Aplikasi IT Asset Management

Panduan singkat untuk memakai aplikasi: mencatat **aset IT**, **SIM Card**, dan data pendukungnya (user, department, kategori, package).

---

## 1. Masuk & peran pengguna

| Peran | Bisa login? | Hak akses |
| --- | --- | --- |
| **Admin** | Ya | Semua fitur: tambah/edit/hapus aset, SIM, user, department, master data |
| **Guest** | Ya | Hanya melihat data (tanpa tombol tambah/edit/hapus) |
| **Non-user** | **Tidak** | Hanya dicatat sebagai pemakai aset/SIM; bukan akun login |

- Login di `/login` dengan **username + password**.
- Login dibatasi **5 kali gagal / 15 menit**.
- Password minimal **8 karakter**.
- Admin hanya boleh ditempatkan di department yang **ditandai "Boleh ada admin"** (mis. IT, Management).

---

## 2. Navigasi

**Menu utama**
- **Dashboard** — ringkasan.
- **Data Aset** — inventaris aset IT.
- **SIM Card** — inventaris SIM.

**Pengaturan** (menu dropdown)
- **User**, **Department**, **Kategori Inventaris**, **Package SIM**.

Di bagian bawah sidebar ada nama & peran kamu, tombol **ganti tema (terang/gelap)**, dan tombol **Keluar**.

---

## 3. Dashboard

- **Banner** dengan gambar tetap (`public/img/banner.jpg`) + sapaan sesuai waktu dan tanggal.
- **Kartu ringkasan**: Total Aset, Total User, Department, Kategori Inventaris.
- **Aset per Kategori Inventaris**, **Aset per Department**, **Kondisi Aset**.
- **Aset Terbaru** (5 aset yang terakhir diperbarui).

---

## 4. Data Aset

- Kolom: `No, Kategori, Asset Name, Code, Serial Number, User, Department, Condition, Image, Date, Doc, Purchase Date, Updated By, Note`.
- **Cari** (nama/code/serial) dan **filter** (department, kategori, kondisi, termasuk sub-department).
- **Tambah / Edit / Hapus** (Admin): upload **Gambar** (maks 2 MB: PNG/JPG/WEBP/GIF) dan **Dokumen** (maks 5 MB: PDF/DOC/DOCX/XLS/XLSX/TXT).
- **Detail aset** menampilkan semua info + lampiran.
- **Export**: tombol **Export** → **CSV** (untuk diolah di Excel) atau **PDF** (untuk cetak/laporan), mengikuti filter yang aktif.
- **Import CSV** (Admin): unggah file CSV. Kolom yang dibutuhkan: `Kategori Inventaris, Asset Name, Code, Serial Number, User (atau Username), Department, Condition, Date, Purchase Date, Note`.
  - `Department` boleh **path lengkap** (mis. `Operations > Base > Base Jakarta`) atau nama.
  - Header lama (`Invent Type`, `Jenis Inventaris`, `Jenis`) tetap diterima.
  - `Code` harus unik. Jika ada 1 baris bermasalah, seluruh import dibatalkan (aman).

---

## 5. SIM Card

- Kolom: **No Handphone, User, Department, Package, CLS Domestic, CLS Roaming**.
- **User** dipilih dari data user; **Department ikut otomatis** dari user tersebut.
- **Package** dipilih dari daftar Package SIM.
- **CLS Domestic / CLS Roaming** = **angka** (jumlah kredit pulsa per bulan), ditampilkan dengan pemisah ribuan.
- Ada **pencarian** (no HP / nama user) dan **filter** (department, package). Tambah/Edit/Hapus khusus Admin.

---

## 6. User

- Menyimpan data orang: **Nama, Username, Password, Role, Posisi**.
- **Posisi** diambil dari struktur di menu **Department**.
- Aturan role mengikuti level posisi:
  - **Admin** → hanya di department bertanda "Boleh ada admin".
  - **Guest** → hanya di department level atas.
  - **Non-user** → hanya di sub-department (tidak bisa login).
- Menambah **Non-user** tanpa password akan dibuatkan password acak otomatis (yang tidak perlu diingat karena tidak bisa login).
- User tidak bisa dihapus jika masih terhubung ke aset atau SIM Card. Admin terakhir juga tidak bisa dihapus/diturunkan.

---

## 7. Department (struktur)

- Bisa **bertingkat**: `Operations > Base > Base Jakarta` (di mana saja).
- **Maksimal 4 level**. Setelah level 4 tidak bisa ditambah sub lagi.
- **"Boleh ada admin"** menentukan department mana yang boleh punya akun Admin (mis. IT, Management).
- Department tidak bisa dihapus jika masih punya **sub-department, user, aset, atau SIM Card**.

---

## 8. Kategori Inventaris & Package SIM

- **Kategori Inventaris** — daftar jenis aset (mis. Laptop, Phone, PC, Printer). Kategori yang masih dipakai aset tidak bisa dihapus.
- **Package SIM** — daftar paket SIM (mis. `Halo+`, `Enterprise Silver`, `Enterprise Diamond`). Package yang masih dipakai SIM tidak bisa dihapus.

---

## 9. Aturan & catatan operasional

- **File upload** disimpan di `public/uploads/` dan **hanya bisa dibuka setelah login**.
- **File lama** otomatis dihapus saat diganti atau asetnya dihapus.
- **Banner** memakai gambar tetap `public/img/banner.jpg` (tidak diubah dari aplikasi).
- **Reset data**: hapus `dev.db`, lalu `npm run db:migrate` + `npm run db:seed`.
- **Isi ulang contoh data**: `npm run db:seed` (perhatian: seed menata ulang department ke susunan contoh).

---

## 10. Sebelum dipakai di production (penting)

1. **File upload saat ini bisa diakses dengan cookie `session` palsu** (middleware hanya memeriksa keberadaan cookie, bukan keabsahannya). Sebaiknya simpan file di luar folder publik dan sajikan lewat route yang memvalidasi sesi. *Ini yang paling perlu dibereskan.*
2. **Cookie sesi basi bisa menyebabkan loop redirect** (`/login ↔ /`). Perlu penanganan saat sesi tidak ditemukan.
3. Aktifkan **HTTPS** + cookie `secure`, dan tambahkan **security headers** (CSP, X-Frame-Options, nosniff).
4. Ganti password default (`admin`/`admin123`) dan set `DATABASE_URL` produksi.

Detail lengkap temuan ada di ringkasan audit.
