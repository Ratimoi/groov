import "dotenv/config";
import { defineConfig } from "prisma/config";

// A URL do banco vem do ambiente. `prisma generate` não conecta, então o fallback evita
// falhar em builds (CI, Render) que não definem DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
