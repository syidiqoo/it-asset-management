import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  // Pastikan Prisma Client hasil generate (termasuk WASM query compiler)
  // ikut tersalin ke bundle serverless Vercel.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
