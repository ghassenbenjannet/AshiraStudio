import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client.js";

migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("Migrations appliquées.");
sqlite.close();
