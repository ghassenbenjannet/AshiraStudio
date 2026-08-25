import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "../lib/env.js";
import * as schema from "./schema.js";

/**
 * CDC v4, Lot 3.1 — PostgreSQL local remplace SQLite. `DATABASE_URL` est l'une des deux seules
 * exceptions restées hors du centre de configuration (§2.2, avec `ENCRYPTION_KEY`) : il faut la
 * base pour lire la base. Connexion applicative sous le rôle dédié `achirah_app` — jamais le
 * propriétaire des tables ni un superutilisateur (Lot 3.3 : sans quoi la RLS serait contournée).
 */
export const pgClient = postgres(env.databaseUrl, { max: 10 });
const baseDb = drizzle(pgClient, { schema });
export type Db = typeof baseDb;

/**
 * CDC v4, Lot 3.3 — isolation multi-tenant par Row Level Security. Chaque requête HTTP authentifiée
 * s'exécute dans une transaction Postgres avec `SET LOCAL app.organisation_id` posé une fois
 * (`executerAvecOrganisation`, appelé par `middleware/organisation.ts`) ; toute lecture/écriture
 * sur une table métier est alors transparemment filtrée par la base elle-même — aucun site d'appel
 * (route, service) n'a besoin d'ajouter `WHERE organisation_id = …` à la main, ni de savoir que
 * cette portée existe.
 *
 * `db` reste le même import partout (`from "../db/client.js"`) : c'est un Proxy qui délègue à la
 * transaction de la requête en cours (résolue via `AsyncLocalStorage`, donc sans paramètre à
 * threader dans chaque fonction de service) quand il y en a une, ou à la connexion de base sinon
 * (scripts hors requête : `db:migrate`, `db:seed`, et les routes qui précèdent la résolution d'une
 * organisation — `/api/init`, `/api/auth/login` — qui ne touchent que des tables globales sans RLS).
 */
const requestDb = new AsyncLocalStorage<Db>();

export const db: Db = new Proxy(baseDb, {
  get(target, prop, receiver) {
    const scoped = requestDb.getStore();
    return Reflect.get(scoped ?? target, prop, scoped ?? target);
  },
}) as Db;

export async function executerAvecOrganisation<T>(organisationId: string, fn: () => Promise<T>): Promise<T> {
  return baseDb.transaction(async (tx) => {
    // `set_config(...)` plutôt que `SET LOCAL ... = $1` : les commandes SET n'acceptent pas de
    // paramètre lié par le protocole étendu — `set_config` est un appel de fonction normal, donc
    // paramétrable en toute sécurité (et non concaténé dans le texte de la requête).
    await tx.execute(sql`SELECT set_config('app.organisation_id', ${organisationId}, true)`);
    return requestDb.run(tx as unknown as Db, fn);
  });
}
