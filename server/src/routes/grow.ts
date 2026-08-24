import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  recommandationUpdateSchema,
  tendanceInsertSchema,
  tendanceUpdateSchema,
  concurrentInsertSchema,
  concurrentUpdateSchema,
  releveConcurrentInsertSchema,
  expressionInsertSchema,
  expressionValidationSchema,
  leconInsertSchema,
  leconUpdateSchema,
} from "@achirah/shared";
import { db } from "../db/client.js";
import { recommandations, tendances, concurrents, relevesConcurrent, expressions, lecons } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { genererRecommandations } from "../services/grow.js";
import { rechercherTendances, adapterTendance } from "../services/ia/tendances.js";
import { ErreurIaIndisponible } from "../lib/anthropic.js";
import type { AppEnv } from "../types.js";

export const growRoutes = new Hono<AppEnv>();

function gererErreurIa(c: any, err: unknown) {
  if (err instanceof ErreurIaIndisponible) return erreurApi(c, 503, "ia_indisponible", err.message);
  throw err;
}

// ───────────────────────── Recommandations (GROW) ─────────────────────────

growRoutes.get("/recommandations", async (c) => {
  const statut = c.req.query("statut");
  let lignes = await db.select().from(recommandations).orderBy(desc(recommandations.created_at));
  if (statut) lignes = lignes.filter((r) => r.statut === statut);
  return c.json({ donnees: lignes });
});

growRoutes.post("/recommandations/generer", exigerCapacite("entites.editer"), async (c) => {
  const lignes = await genererRecommandations();
  return c.json({ donnees: lignes });
});

growRoutes.patch("/recommandations/:id", exigerCapacite("entites.editer"), zValidator("json", recommandationUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(recommandations).where(eq(recommandations.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Recommandation introuvable");
  const [modifie] = (await db.update(recommandations).set(c.req.valid("json")).where(eq(recommandations.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "recommandation.modifier", entiteType: "recommandation", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

// ───────────────────────── Tendances ─────────────────────────

growRoutes.get("/tendances", async (c) => {
  const statut = c.req.query("statut");
  let lignes = await db.select().from(tendances).orderBy(desc(tendances.created_at));
  if (statut) lignes = lignes.filter((t) => t.statut === statut);
  return c.json({ donnees: lignes });
});

growRoutes.post("/tendances", exigerCapacite("entites.editer"), zValidator("json", tendanceInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(tendances).values(c.req.valid("json")).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "tendance.creer", entiteType: "tendance", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

growRoutes.patch("/tendances/:id", exigerCapacite("entites.editer"), zValidator("json", tendanceUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(tendances).where(eq(tendances.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Tendance introuvable");
  const [modifie] = (await db.update(tendances).set(c.req.valid("json")).where(eq(tendances.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "tendance.modifier", entiteType: "tendance", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

const rechercheSchema = z.object({ categorie: z.string().min(1) });
growRoutes.post("/tendances/rechercher", exigerCapacite("entites.editer"), zValidator("json", rechercheSchema), async (c) => {
  try {
    const propositions = await rechercherTendances(c.req.valid("json").categorie);
    return c.json({ donnees: propositions });
  } catch (err) {
    return gererErreurIa(c, err);
  }
});

growRoutes.post("/tendances/:id/adapter", exigerCapacite("entites.editer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [tendance] = await db.select().from(tendances).where(eq(tendances.id, id)).limit(1);
  if (!tendance) return erreurApi(c, 404, "introuvable", "Tendance introuvable");
  try {
    const declinaisons = await adapterTendance(tendance.titre, tendance.description);
    const adaptation = declinaisons.map((d, i) => `${i + 1}. ${d}`).join("\n\n");
    const [modifie] = (await db.update(tendances).set({ adaptation }).where(eq(tendances.id, id)).returning()) as any[];
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "tendance.adapter", entiteType: "tendance", entiteId: id, viaAgent: true });
    return c.json({ donnees: modifie });
  } catch (err) {
    return gererErreurIa(c, err);
  }
});

// ───────────────────────── Concurrents & veille (EX3 : saisie manuelle stricte) ─────────────────────────

growRoutes.get("/concurrents", async (c) => c.json({ donnees: await db.select().from(concurrents) }));

growRoutes.post("/concurrents", exigerCapacite("entites.editer"), zValidator("json", concurrentInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(concurrents).values(c.req.valid("json")).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "concurrent.creer", entiteType: "concurrent", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

growRoutes.patch("/concurrents/:id", exigerCapacite("entites.editer"), zValidator("json", concurrentUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(concurrents).where(eq(concurrents.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Concurrent introuvable");
  const [modifie] = (await db.update(concurrents).set(c.req.valid("json")).where(eq(concurrents.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "concurrent.modifier", entiteType: "concurrent", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

growRoutes.get("/concurrents/:id/releves", async (c) => {
  const lignes = await db.select().from(relevesConcurrent).where(eq(relevesConcurrent.concurrent_id, c.req.param("id"))).orderBy(desc(relevesConcurrent.date));
  return c.json({ donnees: lignes });
});

growRoutes.post("/concurrents/:id/releves", exigerCapacite("entites.editer"), zValidator("json", releveConcurrentInsertSchema.omit({ concurrent_id: true })), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const concurrentId = c.req.param("id");
  const [cree] = (await db.insert(relevesConcurrent).values({ ...c.req.valid("json"), concurrent_id: concurrentId }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "releve_concurrent.creer", entiteType: "releve_concurrent", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

// ───────────────────────── Lexique (expressions) — RG-CU1/CU2 ─────────────────────────

growRoutes.get("/expressions", async (c) => {
  const statut = c.req.query("statut");
  let lignes = await db.select().from(expressions).orderBy(desc(expressions.created_at));
  if (statut) lignes = lignes.filter((e) => e.statut === statut);
  return c.json({ donnees: lignes });
});

growRoutes.post("/expressions", exigerCapacite("entites.editer"), zValidator("json", expressionInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(expressions).values({ ...c.req.valid("json"), ajoutee_par: utilisateur.id }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "expression.proposer", entiteType: "expression", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

growRoutes.post("/expressions/:id/valider", exigerCapacite("approbation.gerer"), zValidator("json", expressionValidationSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(expressions).where(eq(expressions.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Expression introuvable");
  const { statut } = c.req.valid("json");
  const [modifie] = (await db.update(expressions).set({ statut, validee_par: utilisateur.id }).where(eq(expressions.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "expression.valider", entiteType: "expression", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

// ───────────────────────── Leçons — RG-LC1/LC2/LC3/LC4 ─────────────────────────

growRoutes.get("/lecons", async (c) => {
  const statut = c.req.query("statut");
  let lignes = await db.select().from(lecons).orderBy(desc(lecons.created_at));
  if (statut) lignes = lignes.filter((l) => l.statut === statut);
  return c.json({ donnees: lignes });
});

growRoutes.post("/lecons", exigerCapacite("entites.editer"), zValidator("json", leconInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(lecons).values({ ...c.req.valid("json"), auteur_id: utilisateur.id }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "lecon.creer", entiteType: "lecon", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

growRoutes.patch("/lecons/:id", exigerCapacite("entites.editer"), zValidator("json", leconUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(lecons).where(eq(lecons.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Leçon introuvable");
  const [modifie] = (await db.update(lecons).set(c.req.valid("json")).where(eq(lecons.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "lecon.modifier", entiteType: "lecon", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

// RG-LC4 : reconfirmer une leçon "perdant" remet son compteur à zéro (elle reste pertinente).
growRoutes.post("/lecons/:id/reconfirmer", exigerCapacite("entites.editer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(lecons).where(eq(lecons.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Leçon introuvable");
  const [modifie] = (await db.update(lecons).set({ fermetures_sans_reconfirmation: 0 }).where(eq(lecons.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "lecon.reconfirmer", entiteType: "lecon", entiteId: id, avant });
  return c.json({ donnees: modifie });
});
