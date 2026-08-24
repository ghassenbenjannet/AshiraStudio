import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  campagneInsertSchema,
  campagneUpdateSchema,
  campagneFermetureSchema,
  campagneArticleInsertSchema,
  ajoutIntelligentSchema,
  budgetLigneInsertSchema,
  budgetLigneUpdateSchema,
} from "@achirah/shared";
import { db } from "../db/client.js";
import { campagnes, campagneArticles, budgetLignes } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { activerCampagne, fermerCampagne, detteDeMesure, genererRituel, extraireMetadonneesUrl } from "../services/campagnes.js";
import { ErreurMetier } from "../services/catalogue.js";
import type { AppEnv } from "../types.js";

export const campagnesRoutes = new Hono<AppEnv>();

function gererErreurMetier(c: any, err: unknown) {
  if (err instanceof ErreurMetier) return erreurApi(c, err.status, err.code, err.message);
  throw err;
}

campagnesRoutes.get("/", async (c) => {
  const statut = c.req.query("statut");
  let lignes = await db.select().from(campagnes);
  if (statut) lignes = lignes.filter((x) => x.statut === statut);
  return c.json({ donnees: lignes });
});

campagnesRoutes.get("/dette-mesure", async (c) => {
  const lignes = await detteDeMesure();
  return c.json({ donnees: lignes });
});

campagnesRoutes.get("/:id", async (c) => {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, c.req.param("id"))).limit(1);
  if (!campagne) return erreurApi(c, 404, "introuvable", "Campagne introuvable");
  return c.json({ donnees: campagne });
});

campagnesRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", campagneInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(campagnes).values({ ...c.req.valid("json"), statut: "preparation" }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "campagne.creer", entiteType: "campagne", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

campagnesRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", campagneUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(campagnes).where(eq(campagnes.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Campagne introuvable");

  const corps = c.req.valid("json");
  // RG-ECO1 : kpi_cibles verrouillées après activation — modification = admin + audit avant/après.
  if (avant.kpi_cibles_verrouillees && corps.kpi_cibles) {
    if (utilisateur.role_systeme !== "admin") {
      return erreurApi(c, 403, "kpi_verrouillees", "Les cibles sont verrouillées — seul un admin peut les modifier");
    }
  }
  // `active` (verrouille les KPI) et `fermee` (exige le rapport) passent exclusivement par leurs
  // endpoints dédiés (RG-ECO1/ECO2) — jamais par ce PATCH générique.
  if (corps.statut === "active" || corps.statut === "fermee") {
    return erreurApi(c, 422, "transition_dediee", `Utilisez POST /campagnes/:id/${corps.statut === "active" ? "activer" : "fermer"}`);
  }
  const [modifie] = (await db.update(campagnes).set(corps).where(eq(campagnes.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "campagne.modifier", entiteType: "campagne", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

campagnesRoutes.post("/:id/activer", exigerCapacite("entites.editer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const campagne = await activerCampagne(c.req.param("id"), utilisateur.id);
    return c.json({ donnees: campagne });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

campagnesRoutes.post("/:id/fermer", exigerCapacite("entites.editer"), zValidator("json", campagneFermetureSchema), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const campagne = await fermerCampagne(c.req.param("id"), c.req.valid("json").rapport, utilisateur.id);
    return c.json({ donnees: campagne });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

// Force-close : réservé admin (§2.1 « fermeture forcée »), sans exiger les KPI/rapport complets.
campagnesRoutes.post("/:id/fermer-de-force", exigerCapacite("parametres.gerer"), zValidator("json", campagneFermetureSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(campagnes).where(eq(campagnes.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Campagne introuvable");
  const [modifie] = (await db.update(campagnes).set({ statut: "fermee", rapport: c.req.valid("json").rapport }).where(eq(campagnes.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "campagne.fermer_de_force", entiteType: "campagne", entiteId: id, avant: { statut: avant.statut } });
  return c.json({ donnees: modifie });
});

campagnesRoutes.post("/:id/rituel", exigerCapacite("entites.editer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const taches = await genererRituel(c.req.param("id"), utilisateur.id);
    return c.json({ donnees: taches }, 201);
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

campagnesRoutes.get("/:id/consolidation", async (c) => {
  const id = c.req.param("id");
  const lignes = await db.select().from(budgetLignes).where(eq(budgetLignes.campagne_id, id));
  const budgetReel = lignes.reduce((s, l) => s + l.reel_dt, 0);
  const budgetEngage = lignes.reduce((s, l) => s + l.engage_dt, 0);
  const budgetPrevu = lignes.reduce((s, l) => s + l.prevu_dt, 0);
  return c.json({
    donnees: {
      budget: { prevu: budgetPrevu, engage: budgetEngage, reel: budgetReel, methode: "budget_lignes" },
      reach_cumule: null,
      contenus_publies: null,
      sessions_attribuees: null,
      commandes_attribuees: null,
      ca_attribue: null,
      roas: null,
      note: "Consolidation complète (reach, sessions, CA, ROAS) disponible en Phase ⑥ — intégrations MEASURE.",
    },
  });
});

// ───────────────────────── Champ d'ajout intelligent (campagne_article) ─────────────────────────

campagnesRoutes.get("/:id/articles", async (c) => {
  const lignes = await db.select().from(campagneArticles).where(eq(campagneArticles.campagne_id, c.req.param("id")));
  return c.json({ donnees: lignes });
});

campagnesRoutes.post("/:id/articles", exigerCapacite("entites.editer"), zValidator("json", ajoutIntelligentSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const campagneId = c.req.param("id");
  const [campagne] = await db.select({ id: campagnes.id }).from(campagnes).where(eq(campagnes.id, campagneId)).limit(1);
  if (!campagne) return erreurApi(c, 404, "introuvable", "Campagne introuvable");

  const entree = c.req.valid("json");
  const ordreActuel = (await db.select({ id: campagneArticles.id }).from(campagneArticles).where(eq(campagneArticles.campagne_id, campagneId))).length;

  let valeurs: Partial<typeof campagneArticles.$inferInsert> = { campagne_id: campagneId, ordre: ordreActuel };
  if (entree.mode === "catalogue") {
    valeurs = { ...valeurs, source: "catalogue", article_coloris_id: entree.article_coloris_id };
  } else if (entree.mode === "lien") {
    const meta = await extraireMetadonneesUrl(entree.url).catch((err) => {
      if (err instanceof ErreurMetier) throw err;
      return { titre_extrait: null, image_extraite_url: null };
    });
    valeurs = { ...valeurs, source: "lien", url: entree.url, titre_extrait: meta.titre_extrait, image_extraite_url: meta.image_extraite_url };
  } else if (entree.mode === "texte") {
    valeurs = { ...valeurs, source: "texte", texte: entree.texte };
  } else {
    valeurs = { ...valeurs, source: "photo", photo_asset_id: entree.photo_asset_id };
  }

  try {
    const [cree] = (await db.insert(campagneArticles).values(valeurs as any).returning()) as any[];
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "campagne_article.creer", entiteType: "campagne_article", entiteId: cree.id, apres: cree });
    return c.json({ donnees: cree }, 201);
  } catch (err) {
    if (err instanceof ErreurMetier) return gererErreurMetier(c, err);
    throw err;
  }
});

// RG-CA2 — Promotion en article catalogue : bascule la source vers `catalogue`.
const promotionSchema = z.object({ article_coloris_id: z.string().uuid() });
campagnesRoutes.patch("/:campagneId/articles/:ligneId/promouvoir", exigerCapacite("entites.editer"), zValidator("json", promotionSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const { ligneId } = c.req.param();
  const [avant] = await db.select().from(campagneArticles).where(eq(campagneArticles.id, ligneId)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Référence introuvable");
  const [modifie] = (await db
    .update(campagneArticles)
    .set({ source: "catalogue", article_coloris_id: c.req.valid("json").article_coloris_id })
    .where(eq(campagneArticles.id, ligneId))
    .returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "campagne_article.promouvoir", entiteType: "campagne_article", entiteId: ligneId, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

// ───────────────────────── Budget (§4.3, écriture admin uniquement — §2.1) ─────────────────────────

campagnesRoutes.get("/:id/budget", async (c) => {
  const lignes = await db.select().from(budgetLignes).where(eq(budgetLignes.campagne_id, c.req.param("id")));
  return c.json({ donnees: lignes });
});

campagnesRoutes.post("/:id/budget", exigerCapacite("parametres.gerer"), zValidator("json", budgetLigneInsertSchema.omit({ campagne_id: true })), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const campagneId = c.req.param("id");
  const [cree] = (await db.insert(budgetLignes).values({ ...c.req.valid("json"), campagne_id: campagneId }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "budget_ligne.creer", entiteType: "budget_ligne", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

campagnesRoutes.patch("/:campagneId/budget/:ligneId", exigerCapacite("parametres.gerer"), zValidator("json", budgetLigneUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const { ligneId } = c.req.param();
  const [avant] = await db.select().from(budgetLignes).where(eq(budgetLignes.id, ligneId)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Ligne budgétaire introuvable");
  const [modifie] = (await db.update(budgetLignes).set(c.req.valid("json")).where(eq(budgetLignes.id, ligneId)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "budget_ligne.modifier", entiteType: "budget_ligne", entiteId: ligneId, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

campagnesRoutes.delete("/:campagneId/budget/:ligneId", exigerCapacite("parametres.gerer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const { ligneId } = c.req.param();
  const [avant] = await db.select().from(budgetLignes).where(eq(budgetLignes.id, ligneId)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Ligne budgétaire introuvable");
  await db.delete(budgetLignes).where(eq(budgetLignes.id, ligneId));
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "budget_ligne.supprimer", entiteType: "budget_ligne", entiteId: ligneId, avant });
  return c.body(null, 204);
});
