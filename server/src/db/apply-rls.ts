import { readFileSync } from "node:fs";
import postgres from "postgres";

/** Applique `rls.sql` sous le rôle propriétaire — jamais `achirah_app` (voir migrate.ts). */
const connectionString = process.env.DATABASE_URL_ADMIN ?? "postgres://postgres:postgres_dev_local_only@127.0.0.1:5432/achirah";

const client = postgres(connectionString, { max: 1 });
const sqlScript = readFileSync(new URL("./rls.sql", import.meta.url), "utf-8");

await client.unsafe(sqlScript);
console.log("Politiques RLS appliquées.");
await client.end();
