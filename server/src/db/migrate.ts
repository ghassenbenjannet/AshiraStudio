import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Les migrations créent des tables (DDL) : `achirah_app` (le rôle applicatif, RLS, Lot 3.3) n'a pas
 * ce droit par conception — seul le propriétaire des tables (`postgres` en local, un rôle
 * propriétaire dédié en production) exécute ce script, jamais le serveur en fonctionnement.
 */
const connectionString = process.env.DATABASE_URL_ADMIN ?? "postgres://postgres:postgres_dev_local_only@127.0.0.1:5432/achirah";

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("Migrations appliquées.");
await client.end();
