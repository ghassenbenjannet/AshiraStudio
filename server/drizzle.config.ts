import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL_ADMIN ?? "postgres://postgres:postgres_dev_local_only@127.0.0.1:5432/achirah",
  },
});
