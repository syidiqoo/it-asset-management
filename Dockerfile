# ---------- Base ----------
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma butuh `openssl` untuk mendeteksi versi libssl saat install/generate.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ---------- Dependency ----------
FROM base AS deps
# `postinstall` menjalankan `prisma generate`, jadi schema harus sudah ada
# sebelum `npm ci`.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---------- Build ----------
FROM base AS builder
ENV NODE_ENV=production
# `next build` meng-import modul route untuk mengumpulkan konfigurasi, dan
# `lib/prisma.ts` membaca DATABASE_URL saat itu. Nilai ini hanya placeholder:
# build tidak menyentuh database. Nilai asli diberikan saat runtime oleh
# docker-compose (tidak diwarisi ke stage runner).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Runtime ----------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
# `.next` harus milik user `node` karena Next.js menulis cache image/fetch
# saat runtime (mis. /app/.next/cache/images untuk next/image).
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
# Amankan dari kemungkinan berkas ter-checkout dengan CRLF.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

# Folder upload disiapkan lebih dulu supaya volume Docker mewarisi
# kepemilikan user `node` (volume baru menyalin isi & izin dari image).
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
