import "dotenv/config";
import { defineConfig } from "prisma/config";

// CLI/migrations pakai koneksi langsung (DIRECT_URL) bila tersedia, supaya
// tidak lewat connection pooler (PgBouncer) yang tidak mendukung migrasi.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
