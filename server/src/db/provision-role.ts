import postgres from "postgres";

/**
 * CDC v4, Lot 3.3 — crée (idempotent) le rôle applicatif dédié `achirah_app` — ni superutilisateur
 * ni propriétaire des tables, condition pour que la RLS s'applique réellement à lui (voir
 * `db/client.ts`) — et lui accorde les privilèges nécessaires, y compris par défaut sur les tables
 * que les migrations suivantes créeront. Exécuté sous la connexion admin, jamais par le serveur en
 * fonctionnement.
 */
const connexionAdmin = process.env.DATABASE_URL_ADMIN ?? "postgres://postgres:postgres_dev_local_only@127.0.0.1:5432/achirah";
const motDePasseApp = (process.env.POSTGRES_APP_PASSWORD ?? "achirah_dev_local_only").replace(/'/g, "''");

const client = postgres(connexionAdmin, { max: 1 });

await client.unsafe(`
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'achirah_app') THEN
      CREATE ROLE achirah_app LOGIN PASSWORD '${motDePasseApp}';
    ELSE
      ALTER ROLE achirah_app PASSWORD '${motDePasseApp}';
    END IF;
  END
  $$;

  GRANT CONNECT ON DATABASE achirah TO achirah_app;
  GRANT USAGE ON SCHEMA public TO achirah_app;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO achirah_app;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO achirah_app;
  -- Tables déjà migrées avant ce provisionnement (relance sur une base existante) : les privilèges
  -- par défaut ci-dessus ne couvrent que les tables futures, pas celles déjà là.
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO achirah_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO achirah_app;
`);

console.log("Rôle achirah_app provisionné.");
await client.end();
