# Deploy di Server Sendiri (Ubuntu 22.04 + Docker)

Panduan menjalankan aplikasi ini di server kantor. Semua yang dibutuhkan
(PostgreSQL, aplikasi Next.js, penyimpanan file) berjalan di dalam Docker,
jadi server tidak perlu memasang Node.js atau PostgreSQL secara manual.

---

## 1. Yang harus disiapkan

| Kebutuhan | Keterangan |
| --- | --- |
| Server **Ubuntu 22.04** | Dengan akses `sudo`. |
| **Docker Engine + Compose plugin** | Langkah pemasangan ada di bawah. |
| **Internet** saat build | Untuk unduh image dasar dan paket npm. |
| Port terbuka | Default **3000** (bisa diubah lewat `APP_PORT`). |
| (Opsional) Domain + HTTPS | Kalau ingin diakses lewat `https://`. |

Perkiraan kebutuhan resource: **RAM minimal 2 GB** (build Next.js cukup berat).

---

## 2. Pasang Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Supaya tidak perlu sudo setiap kali
sudo usermod -aG docker $USER
```

> Setelah `usermod`, **keluar lalu login ulang** (atau reboot) agar grupnya aktif.
> Cek dengan: `docker compose version`.

---

## 3. Ambil kode aplikasi

```bash
sudo mkdir -p /opt/it-asset-management
sudo chown $USER /opt/it-asset-management
git clone <URL-REPO> /opt/it-asset-management
cd /opt/it-asset-management
```

Kalau tidak memakai Git, salin folder proyek ke server dengan `scp`:

```bash
scp -r ./app-tmp user@IP-SERVER:/opt/it-asset-management
```

---

## 4. Buat file `.env`

```bash
cp .env.docker.example .env
nano .env
```

Isi yang perlu diperhatikan:

| Variabel | Keterangan |
| --- | --- |
| `POSTGRES_PASSWORD` | Password database. **Pakai karakter alfanumerik saja** (tanpa `@ : / ? # &`), karena nilai ini dirangkai menjadi `DATABASE_URL`. |
| `POSTGRES_USER`, `POSTGRES_DB` | Boleh dibiarkan default (`itasset`). |
| `APP_PORT` | Port di server. Isi `80` kalau ingin diakses tanpa `:3000`. |
| `COOKIE_SECURE` | `false` untuk HTTP, `true` untuk HTTPS. |

File `.env` ini **jangan di-commit** (sudah masuk `.gitignore`).

---

## 5. Build dan jalankan

```bash
docker compose up -d --build
```

Proses build pertama cukup lama (beberapa menit). Pantau dengan:

```bash
docker compose logs -f app
```

Saat container mulai, otomatis dijalankan migrasi database (`prisma migrate deploy`),
jadi tabel dibuat sendiri. Tunggu sampai muncul pesan aplikasi siap.

Cek status:

```bash
docker compose ps
```

---

## 6. Isi data awal (sekali saja)

Database baru masih kosong, jadi belum ada akun. Jalankan seed:

```bash
docker compose exec app npx prisma db seed
```

Ini membuat akun, department, kategori, dan contoh aset.

---

## 7. Akses aplikasi

Buka `http://IP-SERVER:3000` (atau port sesuai `APP_PORT`).

| Peran | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Guest | `guest` | `guest123` |

**Segera ganti password default** lewat menu **User** setelah login pertama.

---

## 8. Perintah harian

```bash
docker compose logs -f app        # lihat log aplikasi
docker compose restart app        # restart aplikasi
docker compose down               # hentikan semua
docker compose up -d              # jalankan lagi
docker compose ps                 # lihat status container
```

**Update aplikasi setelah ada perubahan kode:**

```bash
git pull
docker compose up -d --build
```

Data di database dan file upload **tidak hilang** saat build ulang, karena
keduanya disimpan di Docker volume (`pgdata` dan `uploads`).

---

## 9. Backup & restore

**Database:**

```bash
# Backup
docker compose exec -T db pg_dump -U itasset itasset > backup-$(date +%F).sql

# Restore
cat backup-2026-01-01.sql | docker compose exec -T db psql -U itasset -d itasset
```

**File upload** (gambar & dokumen):

```bash
docker run --rm \
  -v app-tmp_uploads:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

> Nama volume mengikuti nama folder proyek. Cek dengan `docker volume ls`.

---

## 10. (Opsional) HTTPS

Kalau server punya domain, cara paling mudah adalah menaruh reverse proxy
di depan. Contoh dengan Caddy:

```
# Caddyfile
aset.kantor.local {
  reverse_proxy app:3000
}
```

Tambahkan service berikut ke `docker-compose.yml`:

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
```

Jangan lupa tambahkan `caddy_data:` di bagian `volumes`, ubah `APP_PORT`
menjadi `127.0.0.1:3000` supaya app tidak terekspos langsung, dan set
`COOKIE_SECURE=true`.

---

## 11. Catatan penting

- **Firewall**: kalau memakai `ufw`, buka portnya: `sudo ufw allow 3000/tcp`.
- **Ganti password default** `admin`/`admin123` sebelum dipakai sungguhan.
- **Koneksi database** memakai nama service `db` di dalam jaringan Docker.
  PostgreSQL **tidak** dibuka ke luar; hanya aplikasi yang bisa mengaksesnya.
- **File upload** disimpan di volume `uploads` (folder `/app/data/uploads`
  di dalam container). Jangan hapus volume itu kalau tidak ingin kehilangan file.
- **`prisma migrate deploy` dijalankan otomatis** setiap container start.
  Kalau ada migrasi baru, cukup `docker compose up -d --build`.
- **Database Neon** yang sebelumnya dipakai untuk Vercel sudah tidak terpakai lagi
  setelah pindah ke server sendiri.
