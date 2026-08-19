import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/jobpilot";

const isRemote =
  connectionString.includes("prisma.io") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("sslmode");

export default defineConfig({
  schema: "./src/services/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  },
});
