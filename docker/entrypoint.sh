#!/bin/sh
set -e

echo "[entrypoint] Menerapkan migrasi database..."

attempt=1
until npx prisma migrate deploy; do
  if [ "$attempt" -ge 15 ]; then
    echo "[entrypoint] Migrasi gagal setelah $attempt percobaan. Keluar." >&2
    exit 1
  fi
  echo "[entrypoint] Database belum siap (percobaan $attempt). Menunggu 3 detik..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "[entrypoint] Migrasi selesai. Menjalankan aplikasi di port ${PORT:-3000}..."

exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
