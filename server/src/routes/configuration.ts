import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { configurationsSysteme } from "../db/schema.js";
import { chiffrer, dechiffrer } from "../lib/crypto.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { env } from "../lib/env.js";
import type { AppEnv } from "../types.js";

export const configurationRoutes = new Hono<AppEnv>();

interface ConfigurationIaStockee {
  apiKey: string;
  modele: string;
  budgetTokensJour: number;
}

function lireIaStockee(): ConfigurationIaStockee | null {
  const ligne = db.select().from(configurationsSysteme).where(eq(configurationsSysteme.cle, "ia")).get();
  if (!ligne) return null;
  return JSON.parse(dechiffrer(ligne.valeur_chiffree)) as ConfigurationIaStockee;
}

configurationRoutes.get("/ia", exigerCapacite("parametres.gerer"), (c) => {
  const configuration = lireIaStockee();
  return c.json({
    donnees: {
      configuree: !!configuration?.apiKey,
      fournisseur: "anthropic",
      modele: configuration?.modele ?? "claude-sonnet-4-6",
      budget_tokens_jour: configuration?.budgetTokensJour ?? env.budgetTokensJourDefaut,
      cle_masquee: configuration?.apiKey ? `••••${configuration.apiKey.slice(-4)}` : null,
    },
  });
});

const configurationIaSchema = z.object({
  api_key: z.string().trim().min(10).optional(),
  modele: z.string().trim().min(3).max(100),
  budget_tokens_jour: z.number().int().min(1_000).max(100_000_000),
});

configurationRoutes.put("/ia", exigerCapacite("parametres.gerer"), zValidator("json", configurationIaSchema), async (c) => {
  const admin = c.get("utilisateur")!;
  const corps = c.req.valid("json");
  const avant = lireIaStockee();
  const apiKey = corps.api_key ?? avant?.apiKey ?? "";
  if (!apiKey) return c.json({ error: { code: "cle_requise", message: "Une clé API est requise pour activer l’IA." } }, 422);

  const valeurChiffree = chiffrer(JSON.stringify({ apiKey, modele: corps.modele, budgetTokensJour: corps.budget_tokens_jour } satisfies ConfigurationIaStockee));
  const maintenant = new Date().toISOString();
  await db
    .insert(configurationsSysteme)
    .values({ cle: "ia", valeur_chiffree: valeurChiffree, updated_at: maintenant })
    .onConflictDoUpdate({ target: configurationsSysteme.cle, set: { valeur_chiffree: valeurChiffree, updated_at: maintenant } });

  await enregistrerAudit({
    utilisateurId: admin.id,
    action: "configuration.ia_modifier",
    entiteType: "configuration_systeme",
    entiteId: "ia",
    avant: avant ? { modele: avant.modele, budgetTokensJour: avant.budgetTokensJour, cleConfiguree: true } : null,
    apres: { modele: corps.modele, budgetTokensJour: corps.budget_tokens_jour, cleConfiguree: true },
  });
  return c.json({ donnees: { configuree: true, fournisseur: "anthropic", modele: corps.modele, budget_tokens_jour: corps.budget_tokens_jour, cle_masquee: `••••${apiKey.slice(-4)}` } });
});

configurationRoutes.delete("/ia", exigerCapacite("parametres.gerer"), async (c) => {
  const admin = c.get("utilisateur")!;
  await db.delete(configurationsSysteme).where(eq(configurationsSysteme.cle, "ia"));
  await enregistrerAudit({ utilisateurId: admin.id, action: "configuration.ia_desactiver", entiteType: "configuration_systeme", entiteId: "ia" });
  return c.body(null, 204);
});
