import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// `.env.local` wins over `.env`, so a local PostgreSQL URL can override the
// shared configuration without editing or leaking the shared file.
dotenv.config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
