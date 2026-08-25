import { Hono } from "hono";
import { gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { integrations, audits } from "../db/schema.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { lireConfigurationIa, tokensConsommesAujourdhui, verifierDisponibiliteIa } from "../lib/ia/fournisseur.js";
import { derniereSauvegarde } from "../lib/sauvegardes.js";
import type { AppEnv } from "../types.js";

export const observabiliteRoutes = new Hono<AppEnv>();

/** §8.1 — Chiffres réels uniquement (RG-PROV) : jamais de métrique fabriquée. */
observabiliteRoutes.get("/statut", exigerCapacite("parametres.gerer"), async (c) => {
  const debutAujourdhui = new Date().toISOString().slice(0, 10);

  // CDC v4, Lot 3.1 — plus un seul fichier (Postgres) : taille réelle de la base entière côté serveur.
  let tailleDbOctets: number | null = null;
  try {
    const [ligne] = await db.execute<{ octets: number }>(sql`SELECT pg_database_size(current_database())::bigint AS octets`);
    tailleDbOctets = ligne ? Number(ligne.octets) : null;
  } catch {
    tailleDbOctets = null;
  }

  const tousLesAudits = await db.select({ at: audits.at }).from(audits).where(gte(audits.at, debutAujourdhui));
  const integrationsToutes = await db.select().from(integrations);
  const configurationIa = await lireConfigurationIa();
  const iaConfiguree = await verifierDisponibiliteIa()
    .then(() => true)
    .catch(() => false);

  return c.json({
    donnees: {
      uptime_secondes: Math.round(process.uptime()),
      taille_db_octets: tailleDbOctets,
      derniere_sauvegarde: derniereSauvegarde(),
      tokens_ia_aujourdhui: await tokensConsommesAujourdhui(),
      budget_tokens_jour: configurationIa.budgetTokensJour,
      audits_aujourdhui: tousLesAudits.length,
      integrations: integrationsToutes.map((i) => ({ plateforme: i.plateforme, statut: i.statut, dernier_sync: i.dernier_sync })),
      ia_configuree: iaConfiguree,
    },
  });
});
