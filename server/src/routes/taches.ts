import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  tacheInsertSchema,
  tacheUpdateSchema,
  shootingUpdateSchema,
  lookInsertSchema,
  lookUpdateSchema,
  lookItemInsertSchema,
  lookItemUpdateSchema,
  poseInsertSchema,
  poseUpdateSchema,
  tacheEnRetard,
} from "@achirah/shared";
import { db } from "../db/client.js";
import { taches, shootings, looks, lookItems, poses, personnes, articleSkus, articleColoris, coloris, articles, campagnes } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { creerTacheAvecCascade, supprimerTacheAvecCascade, calculerPiecesEffectives, pretATournerDeShooting } from "../services/taches.js";
import { genererVevent, genererIcsUnitaire } from "../lib/ics.js";
import { genererCallSheetPdf } from "../lib/callsheet-pdf.js";
import { ErreurMetier } from "../services/catalogue.js";
import type { AppEnv } from "../types.js";

export const tachesRoutes = new Hono<AppEnv>();

function aujourdhuiIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" });
}

// ───────────────────────── Tâches ─────────────────────────

tachesRoutes.get("/", async (c) => {
  const campagneId = c.req.query("campagne_id");
  const type = c.req.query("type");
  const statut = c.req.query("statut");
  const assigneId = c.req.query("assigne_id");
  const quand = c.req.query("quand"); // aujourdhui | semaine | retard

  let lignes = await db.select().from(taches);
  if (campagneId) lignes = lignes.filter((t) => t.campagne_id === campagneId);
  if (type) lignes = lignes.filter((t) => t.type === type);
  if (statut) lignes = lignes.filter((t) => t.statut === statut);
  if (assigneId) lignes = lignes.filter((t) => t.assigne_ids.includes(assigneId));

  const aujourdhui = aujourdhuiIso();
  if (quand === "retard") lignes = lignes.filter((t) => tacheEnRetard(t as any, aujourdhui));
  if (quand === "aujourdhui") lignes = lignes.filter((t) => t.date_echeance === aujourdhui);
  if (quand === "semaine") {
    const dans7j = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    lignes = lignes.filter((t) => t.date_echeance >= aujourdhui && t.date_echeance <= dans7j);
  }

  // RG-T2 : tri par défaut échéance croissante.
  lignes.sort((a, b) => a.date_echeance.localeCompare(b.date_echeance));
  return c.json({ donnees: lignes });
});

tachesRoutes.get("/:id", async (c) => {
  const [tache] = await db.select().from(taches).where(eq(taches.id, c.req.param("id"))).limit(1);
  if (!tache) return erreurApi(c, 404, "introuvable", "Tâche introuvable");
  return c.json({ donnees: tache });
});

tachesRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", tacheInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const tache = await creerTacheAvecCascade(c.req.valid("json") as any);
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "tache.creer", entiteType: "tache", entiteId: tache.id, apres: tache });
  return c.json({ donnees: tache }, 201);
});

tachesRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", tacheUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(taches).where(eq(taches.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Tâche introuvable");

  const corps: Record<string, unknown> = { ...c.req.valid("json") };
  // done_at auto (vidé à la réouverture) — §4.4.
  if (corps.statut === "fait" && avant.statut !== "fait") corps.done_at = new Date().toISOString();
  if (corps.statut && corps.statut !== "fait") corps.done_at = null;

  const [modifie] = (await db.update(taches).set(corps).where(eq(taches.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "tache.modifier", entiteType: "tache", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

tachesRoutes.delete("/:id", exigerCapacite("entites.editer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  try {
    await supprimerTacheAvecCascade(c.req.param("id"));
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "tache.supprimer", entiteType: "tache", entiteId: c.req.param("id") });
    return c.body(null, 204);
  } catch (err) {
    if (err instanceof ErreurMetier) return erreurApi(c, err.status, err.code, err.message);
    throw err;
  }
});

// ───────────────────────── Shooting (1-1 avec tache, §4.4) ─────────────────────────

async function chargerShootingEnrichi(tacheId: string) {
  const [shooting] = await db.select().from(shootings).where(eq(shootings.tache_id, tacheId)).limit(1);
  if (!shooting) return null;
  const piecesEffectives = await calculerPiecesEffectives(tacheId, shooting.pieces);
  const pretATourner = await pretATournerDeShooting(tacheId);
  return { ...shooting, pieces_effectives: piecesEffectives, pret_a_tourner: pretATourner };
}

tachesRoutes.get("/:id/shooting", async (c) => {
  const shooting = await chargerShootingEnrichi(c.req.param("id"));
  if (!shooting) return erreurApi(c, 404, "introuvable", "Shooting introuvable");
  return c.json({ donnees: shooting });
});

tachesRoutes.patch("/:id/shooting", exigerCapacite("entites.editer"), zValidator("json", shootingUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const tacheId = c.req.param("id");
  const [avant] = await db.select().from(shootings).where(eq(shootings.tache_id, tacheId)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Shooting introuvable");
  await db.update(shootings).set(c.req.valid("json")).where(eq(shootings.tache_id, tacheId));
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "shooting.modifier", entiteType: "shooting", entiteId: tacheId, avant });
  const shooting = await chargerShootingEnrichi(tacheId);
  return c.json({ donnees: shooting });
});

tachesRoutes.get("/:id/ics", async (c) => {
  const tacheId = c.req.param("id");
  const [tache] = await db.select().from(taches).where(eq(taches.id, tacheId)).limit(1);
  if (!tache) return erreurApi(c, 404, "introuvable", "Tâche introuvable");
  const [shooting] = await db.select().from(shootings).where(eq(shootings.tache_id, tacheId)).limit(1);
  const [campagne] = await db.select({ nom: campagnes.nom }).from(campagnes).where(eq(campagnes.id, tache.campagne_id)).limit(1);
  const assignes = tache.assigne_ids.length ? await db.select({ nom: personnes.nom }).from(personnes).where(eq(personnes.id, tache.assigne_ids[0]!)) : [];
  const vevent = genererVevent(tache, shooting ?? null, {
    campagneNom: campagne?.nom,
    assignesNoms: assignes.map((a) => a.nom),
    lieu: tache.lieu,
    deepLink: `${new URL(c.req.url).origin}/plan/taches/${tache.id}`,
  });
  return c.body(genererIcsUnitaire(vevent), 200, { "Content-Type": "text/calendar; charset=utf-8" });
});

tachesRoutes.get("/:id/brief", (c) => erreurApi(c, 501, "non_disponible", "Le brief IA sera disponible en Phase ⑤"));

// ───────────────────────── Call sheet PDF ─────────────────────────

export const shootingsRoutes = new Hono<AppEnv>();

shootingsRoutes.get("/:id/callsheet.pdf", async (c) => {
  const tacheId = c.req.param("id");
  const [tache] = await db.select().from(taches).where(eq(taches.id, tacheId)).limit(1);
  const [shooting] = await db.select().from(shootings).where(eq(shootings.tache_id, tacheId)).limit(1);
  if (!tache || !shooting) return erreurApi(c, 404, "introuvable", "Shooting introuvable");
  const [campagne] = await db.select({ nom: campagnes.nom }).from(campagnes).where(eq(campagnes.id, tache.campagne_id)).limit(1);

  const [photographe] = shooting.photographe_id ? await db.select().from(personnes).where(eq(personnes.id, shooting.photographe_id)) : [];
  const modelesPersonnes = shooting.modele_ids.length ? await db.select().from(personnes).where(eq(personnes.id, shooting.modele_ids[0]!)) : [];
  const tousLesModeles = await Promise.all(shooting.modele_ids.map((id) => db.select().from(personnes).where(eq(personnes.id, id)).then((r) => r[0])));

  const piecesEffectives = await calculerPiecesEffectives(tacheId, shooting.pieces);
  const skus = piecesEffectives.length ? await db.select().from(articleSkus).where(eq(articleSkus.id, piecesEffectives[0]!.article_sku_id)) : [];
  const piecesDetaillees = await Promise.all(
    piecesEffectives.map(async (p) => {
      const [sku] = await db.select().from(articleSkus).where(eq(articleSkus.id, p.article_sku_id)).limit(1);
      if (!sku) return { label: "?", taille: "?" };
      const [ac] = await db.select().from(articleColoris).where(eq(articleColoris.id, sku.article_coloris_id)).limit(1);
      const [article] = ac ? await db.select().from(articles).where(eq(articles.id, ac.article_id)) : [];
      const [col] = ac ? await db.select().from(coloris).where(eq(coloris.id, ac.coloris_id)) : [];
      return { label: `${article?.reference ?? "?"} — ${article?.nom ?? "?"} (${col?.nom_commercial ?? "?"})`, taille: sku.taille };
    }),
  );

  const lignesLooks = await db.select().from(looks).where(eq(looks.shooting_id, tacheId));
  const looksDetailles = await Promise.all(
    lignesLooks.map(async (look) => {
      const items = await db.select().from(lookItems).where(eq(lookItems.look_id, look.id));
      const labels = await Promise.all(
        items.map(async (item) => {
          if (item.source === "texte") return item.texte ?? "";
          if (item.source === "catalogue" && item.article_coloris_id) {
            const [ac] = await db.select().from(articleColoris).where(eq(articleColoris.id, item.article_coloris_id)).limit(1);
            const [article] = ac ? await db.select().from(articles).where(eq(articles.id, ac.article_id)) : [];
            return article?.reference ?? "";
          }
          return "photo";
        }),
      );
      return { nom: look.nom, items: labels.filter(Boolean) };
    }),
  );

  const lignesPoses = await db.select().from(poses).where(eq(poses.shooting_id, tacheId));

  const doc = genererCallSheetPdf({
    campagneNom: campagne?.nom ?? "",
    titre: tache.titre,
    date: tache.date_echeance,
    lieu: tache.lieu,
    heureLumiere: shooting.heure_lumiere,
    photographe: photographe ? { nom: photographe.nom, telephone: photographe.telephone } : null,
    modeles: tousLesModeles.filter((m): m is NonNullable<typeof m> => !!m).map((m) => ({ nom: m.nom, telephone: m.telephone, tailles: m.tailles })),
    pieces: piecesDetaillees,
    looks: looksDetailles,
    poses: lignesPoses.map((p) => ({ ordre: p.ordre, description: p.description, dureeMin: p.duree_min })),
    materiel: shooting.materiel,
  });

  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", `inline; filename="callsheet-${tache.titre.replace(/[^a-z0-9]/gi, "-")}.pdf"`);
  return c.body((await streamVersBuffer(doc)) as Uint8Array<ArrayBuffer>, 200);
});

function streamVersBuffer(doc: PDFKit.PDFDocument): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
  });
}

// ───────────────────────── Looks & poses ─────────────────────────

shootingsRoutes.get("/:id/looks", async (c) => {
  const lignes = await db.select().from(looks).where(eq(looks.shooting_id, c.req.param("id")));
  return c.json({ donnees: lignes });
});

shootingsRoutes.post("/:id/looks", exigerCapacite("entites.editer"), zValidator("json", lookInsertSchema.omit({ shooting_id: true })), async (c) => {
  const [cree] = (await db.insert(looks).values({ ...c.req.valid("json"), shooting_id: c.req.param("id") }).returning()) as any[];
  return c.json({ donnees: cree }, 201);
});

shootingsRoutes.get("/:id/poses", async (c) => {
  const lignes = await db.select().from(poses).where(eq(poses.shooting_id, c.req.param("id")));
  return c.json({ donnees: lignes.sort((a, b) => a.ordre - b.ordre) });
});

shootingsRoutes.post("/:id/poses", exigerCapacite("entites.editer"), zValidator("json", poseInsertSchema.omit({ shooting_id: true })), async (c) => {
  const [cree] = (await db.insert(poses).values({ ...c.req.valid("json"), shooting_id: c.req.param("id") }).returning()) as any[];
  return c.json({ donnees: cree }, 201);
});

export const looksRoutes = new Hono<AppEnv>();

looksRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", lookUpdateSchema), async (c) => {
  const [modifie] = (await db.update(looks).set(c.req.valid("json")).where(eq(looks.id, c.req.param("id"))).returning()) as any[];
  if (!modifie) return erreurApi(c, 404, "introuvable", "Look introuvable");
  return c.json({ donnees: modifie });
});

looksRoutes.delete("/:id", exigerCapacite("entites.editer"), async (c) => {
  const id = c.req.param("id");
  await db.delete(lookItems).where(eq(lookItems.look_id, id));
  await db.delete(looks).where(eq(looks.id, id));
  return c.body(null, 204);
});

looksRoutes.get("/:id/items", async (c) => {
  const lignes = await db.select().from(lookItems).where(eq(lookItems.look_id, c.req.param("id")));
  return c.json({ donnees: lignes.sort((a, b) => a.ordre - b.ordre) });
});

looksRoutes.post("/:id/items", exigerCapacite("entites.editer"), zValidator("json", lookItemInsertSchema.omit({ look_id: true })), async (c) => {
  const [cree] = (await db.insert(lookItems).values({ ...c.req.valid("json"), look_id: c.req.param("id") }).returning()) as any[];
  return c.json({ donnees: cree }, 201);
});

export const lookItemsRoutes = new Hono<AppEnv>();
lookItemsRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", lookItemUpdateSchema), async (c) => {
  const [modifie] = (await db.update(lookItems).set(c.req.valid("json")).where(eq(lookItems.id, c.req.param("id"))).returning()) as any[];
  if (!modifie) return erreurApi(c, 404, "introuvable", "Item introuvable");
  return c.json({ donnees: modifie });
});
lookItemsRoutes.delete("/:id", exigerCapacite("entites.editer"), async (c) => {
  await db.delete(lookItems).where(eq(lookItems.id, c.req.param("id")));
  return c.body(null, 204);
});

export const posesRoutes = new Hono<AppEnv>();
posesRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", poseUpdateSchema), async (c) => {
  const [modifie] = (await db.update(poses).set(c.req.valid("json")).where(eq(poses.id, c.req.param("id"))).returning()) as any[];
  if (!modifie) return erreurApi(c, 404, "introuvable", "Pose introuvable");
  return c.json({ donnees: modifie });
});
posesRoutes.delete("/:id", exigerCapacite("entites.editer"), async (c) => {
  await db.delete(poses).where(eq(poses.id, c.req.param("id")));
  return c.body(null, 204);
});
