import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  articleInsertSchema,
  articleUpdateSchema,
  articleColorisInsertSchema,
  articleColorisUpdateSchema,
  articleSkuInsertSchema,
  articleSkuUpdateSchema,
  articleCoutUpsertSchema,
  calculerCogs,
  calculerMargePct,
  STATUT_CYCLE_ARTICLE,
} from "@achirah/shared";
import { db } from "../db/client.js";
import { articles, articleColoris, articleSkus, articleCouts, historiqueStatuts, gammes, assets, coloris } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { transitionnerArticle, verifierAutoEpuisement, verifierBaissePrix, ErreurMetier } from "../services/catalogue.js";
import { importerArticles } from "../services/import-articles.js";
import { enregistrerFichier } from "../lib/storage.js";
import type { AppEnv } from "../types.js";

export const catalogueRoutes = new Hono<AppEnv>();

function gererErreurMetier(c: any, err: unknown) {
  if (err instanceof ErreurMetier) return erreurApi(c, err.status, err.code, err.message, undefined);
  throw err;
}

// ───────────────────────── Articles ─────────────────────────

const articlesRoutes = new Hono<AppEnv>();

articlesRoutes.get("/", async (c) => {
  const gammeId = c.req.query("gamme_id");
  const statut = c.req.query("statut");
  const categorieId = c.req.query("categorie_id");
  const recherche = c.req.query("q")?.toLowerCase();

  let lignes = await db.select().from(articles);
  if (gammeId) lignes = lignes.filter((a) => a.gamme_id === gammeId);
  if (statut) lignes = lignes.filter((a) => a.statut_cycle === statut);
  if (categorieId) lignes = lignes.filter((a) => a.categorie_id === categorieId);
  if (recherche) lignes = lignes.filter((a) => a.nom.toLowerCase().includes(recherche) || a.reference.toLowerCase().includes(recherche));
  return c.json({ donnees: lignes });
});

articlesRoutes.get("/import/gabarit", (c) => {
  return c.text(
    "reference,nom,gamme,prix,categorie,matiere,tailles,numerote,numerotation_total,statut,notes\nST-09,Nouveau tee,STREET,89,Tee,Coton,S/M/L,,,idee,\n",
    200,
    { "Content-Type": "text/csv; charset=utf-8" },
  );
});

articlesRoutes.post("/import", exigerCapacite("entites.editer"), async (c) => {
  const dryRun = c.req.query("dry_run") === "1" || c.req.query("dry_run") === "true";
  const utilisateur = c.get("utilisateur")!;
  const contentType = c.req.header("content-type") ?? "";
  let texte: string;
  if (contentType.includes("multipart/form-data")) {
    const corps = await c.req.parseBody();
    const fichier = corps["fichier"];
    if (!(fichier instanceof File)) return erreurApi(c, 400, "fichier_requis", "Fichier CSV requis (champ 'fichier')");
    texte = await fichier.text();
  } else {
    texte = await c.req.text();
  }

  try {
    const rapport = await importerArticles(texte, dryRun, utilisateur.id);
    if (!dryRun) {
      await enregistrerAudit({
        utilisateurId: utilisateur.id,
        action: "article.import",
        entiteType: "article",
        apres: { nb_nouveaux: rapport.nb_nouveaux, nb_mises_a_jour: rapport.nb_mises_a_jour, nb_erreurs: rapport.nb_erreurs },
      });
    }
    return c.json({ donnees: rapport });
  } catch (err) {
    return erreurApi(c, 422, "import_invalide", err instanceof Error ? err.message : "Import invalide");
  }
});

articlesRoutes.get("/:id", async (c) => {
  const [article] = await db.select().from(articles).where(eq(articles.id, c.req.param("id"))).limit(1);
  if (!article) return erreurApi(c, 404, "introuvable", "Article introuvable");
  return c.json({ donnees: article });
});

articlesRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", articleInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [gamme] = await db.select().from(gammes).where(eq(gammes.id, c.req.valid("json").gamme_id)).limit(1);
  if (!gamme) return erreurApi(c, 422, "gamme_invalide", "Gamme introuvable", "gamme_id");

  // Référence auto-générée si non fournie explicitement par un numéro déjà pris ; sinon telle quelle après validation d'unicité.
  const existante = await db.select({ reference: articles.reference }).from(articles);
  if (existante.some((a) => a.reference === c.req.valid("json").reference)) {
    return erreurApi(c, 409, "reference_utilisee", "Cette référence existe déjà", "reference");
  }

  const [cree] = (await db.insert(articles).values({ ...c.req.valid("json"), statut_cycle: "idee" }).returning()) as any[];
  await db.insert(historiqueStatuts).values({ article_id: cree.id, de: null, vers: "idee", par: utilisateur.id });
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article.creer", entiteType: "article", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

articlesRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", articleUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Article introuvable");
  const [modifie] = (await db.update(articles).set(c.req.valid("json")).where(eq(articles.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article.modifier", entiteType: "article", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

const transitionSchema = z.object({
  vers: z.enum(STATUT_CYCLE_ARTICLE),
  essaye_sur_5_morphologies: z.boolean().optional(),
  confirmer_archivage_utilise: z.boolean().optional(),
});

articlesRoutes.post("/:id/transition", exigerCapacite("entites.editer"), zValidator("json", transitionSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const corps = c.req.valid("json");
  try {
    const { article, avertissements } = await transitionnerArticle(c.req.param("id"), corps.vers, utilisateur.id, utilisateur.role_systeme, {
      essayeSur5Morphologies: corps.essaye_sur_5_morphologies,
      confirmerArchivageUtilise: corps.confirmer_archivage_utilise,
    });
    return c.json({ donnees: article, avertissements });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

articlesRoutes.get("/:id/historique", async (c) => {
  const lignes = await db.select().from(historiqueStatuts).where(eq(historiqueStatuts.article_id, c.req.param("id")));
  return c.json({ donnees: lignes });
});

// COGS — admin uniquement (§4.2, §2.1)
articlesRoutes.get("/:id/couts", exigerCapacite("parametres.gerer"), async (c) => {
  const articleId = c.req.param("id");
  const [couts] = await db.select().from(articleCouts).where(eq(articleCouts.article_id, articleId)).limit(1);
  const [article] = await db.select({ gamme_id: articles.gamme_id }).from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) return erreurApi(c, 404, "introuvable", "Article introuvable");
  const colorisList = await db.select().from(articleColoris).where(eq(articleColoris.article_id, articleId));
  const prixMin = colorisList.filter((cl) => cl.prix_dt).length ? Math.min(...colorisList.filter((cl) => cl.prix_dt).map((cl) => cl.prix_dt as number)) : null;
  const cogs = couts ? calculerCogs(couts) : null;
  const marge = cogs !== null && prixMin !== null ? calculerMargePct(prixMin, cogs) : null;
  return c.json({ donnees: couts ?? null, cogs, marge_pct: marge });
});

articlesRoutes.put("/:id/couts", exigerCapacite("parametres.gerer"), zValidator("json", articleCoutUpsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const articleId = c.req.param("id");
  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) return erreurApi(c, 404, "introuvable", "Article introuvable");
  const [existant] = await db.select().from(articleCouts).where(eq(articleCouts.article_id, articleId)).limit(1);
  const corps = c.req.valid("json");
  let resultat;
  if (existant) {
    [resultat] = (await db.update(articleCouts).set(corps).where(eq(articleCouts.article_id, articleId)).returning()) as any[];
  } else {
    [resultat] = (await db.insert(articleCouts).values({ article_id: articleId, ...corps }).returning()) as any[];
  }
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article.couts", entiteType: "article", entiteId: articleId, avant: existant ?? null, apres: resultat });
  return c.json({ donnees: resultat });
});

// ───────────────────────── Coloris d'article (niveau COLORIS) ─────────────────────────

articlesRoutes.get("/:id/coloris", async (c) => {
  const lignes = await db.select().from(articleColoris).where(eq(articleColoris.article_id, c.req.param("id")));
  return c.json({ donnees: lignes });
});

articlesRoutes.post("/:id/coloris", exigerCapacite("entites.editer"), zValidator("json", articleColorisInsertSchema.omit({ article_id: true })), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const articleId = c.req.param("id");
  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) return erreurApi(c, 404, "introuvable", "Article introuvable");
  const [cree] = (await db.insert(articleColoris).values({ ...c.req.valid("json"), article_id: articleId }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article_coloris.creer", entiteType: "article_coloris", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

catalogueRoutes.route("/articles", articlesRoutes);

const colorisRoutes = new Hono<AppEnv>();

colorisRoutes.get("/:id", async (c) => {
  const [ligne] = await db.select().from(articleColoris).where(eq(articleColoris.id, c.req.param("id"))).limit(1);
  if (!ligne) return erreurApi(c, 404, "introuvable", "Coloris introuvable");
  return c.json({ donnees: ligne });
});

const colorisUpdateAvecConfirmationSchema = articleColorisUpdateSchema.extend({ confirmer_baisse_prix: z.boolean().optional() });

colorisRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", colorisUpdateAvecConfirmationSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const { confirmer_baisse_prix, ...corps } = c.req.valid("json");
  const [avant] = await db.select().from(articleColoris).where(eq(articleColoris.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Coloris introuvable");

  if (typeof corps.prix_dt === "number") {
    const { blocage } = await verifierBaissePrix(id, corps.prix_dt, !!confirmer_baisse_prix);
    if (blocage) return erreurApi(c, 409, "confirmation_requise_baisse_prix", blocage.message);
  }

  const [modifie] = (await db.update(articleColoris).set(corps).where(eq(articleColoris.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article_coloris.modifier", entiteType: "article_coloris", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

colorisRoutes.post("/:id/photos", exigerCapacite("entites.editer"), async (c) => {
  const id = c.req.param("id");
  const [ac] = await db.select().from(articleColoris).where(eq(articleColoris.id, id)).limit(1);
  if (!ac) return erreurApi(c, 404, "introuvable", "Coloris introuvable");
  const corps = await c.req.parseBody({ all: true });
  const fichiers = ([] as File[]).concat((corps["fichiers"] as any) ?? []).filter((f): f is File => f instanceof File);
  if (fichiers.length === 0) return erreurApi(c, 400, "fichiers_requis", "Au moins un fichier requis (champ 'fichiers')");

  // photos = asset_ids (§4.2) : chaque fichier devient un asset réel, jamais un id de stockage brut.
  const utilisateur = c.get("utilisateur")!;
  const nouveauxAssetIds: string[] = [];
  for (const fichier of fichiers) {
    try {
      const stocke = await enregistrerFichier(new Uint8Array(await fichier.arrayBuffer()), fichier.type);
      const [asset] = (await db
        .insert(assets)
        .values({
          type: "photo",
          fichier_url: stocke.url,
          vignette_url: null,
          nom: fichier.name || `photo-${stocke.id}`,
          source: "studio",
          article_coloris_ids: [id],
          createur_personne_ids: [],
        })
        .returning()) as any[];
      nouveauxAssetIds.push(asset.id);
    } catch (err) {
      return erreurApi(c, 422, "fichier_invalide", err instanceof Error ? err.message : "Fichier invalide");
    }
  }

  const [modifie] = (await db
    .update(articleColoris)
    .set({ photos: [...ac.photos, ...nouveauxAssetIds] })
    .where(eq(articleColoris.id, id))
    .returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article_coloris.photos", entiteType: "article_coloris", entiteId: id, apres: { ajoutees: nouveauxAssetIds.length } });
  return c.json({ donnees: modifie }, 201);
});

colorisRoutes.get("/:id/skus", async (c) => {
  const lignes = await db.select().from(articleSkus).where(eq(articleSkus.article_coloris_id, c.req.param("id")));
  return c.json({ donnees: lignes });
});

colorisRoutes.post("/:id/skus", exigerCapacite("entites.editer"), zValidator("json", articleSkuInsertSchema.omit({ article_coloris_id: true })), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const articleColorisId = c.req.param("id");
  const [ac] = await db.select({ id: articleColoris.id }).from(articleColoris).where(eq(articleColoris.id, articleColorisId)).limit(1);
  if (!ac) return erreurApi(c, 404, "introuvable", "Coloris introuvable");
  const [cree] = (await db.insert(articleSkus).values({ ...c.req.valid("json"), article_coloris_id: articleColorisId }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article_sku.creer", entiteType: "article_sku", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

catalogueRoutes.route("/coloris", colorisRoutes);

const skusRoutes = new Hono<AppEnv>();

// Vue jointe pratique (référence + nom + coloris + taille) — réutilisée par le call sheet et sa liste de pièces.
skusRoutes.get("/:id/detail", async (c) => {
  const [sku] = await db.select().from(articleSkus).where(eq(articleSkus.id, c.req.param("id"))).limit(1);
  if (!sku) return erreurApi(c, 404, "introuvable", "SKU introuvable");
  const [ac] = await db.select().from(articleColoris).where(eq(articleColoris.id, sku.article_coloris_id)).limit(1);
  const [article] = ac ? await db.select().from(articles).where(eq(articles.id, ac.article_id)) : [];
  const [col] = ac ? await db.select().from(coloris).where(eq(coloris.id, ac.coloris_id)) : [];
  return c.json({
    donnees: {
      sku,
      label: `${article?.reference ?? "?"} — ${article?.nom ?? "?"} (${col?.nom_commercial ?? "?"}) — ${sku.taille}`,
    },
  });
});

skusRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", articleSkuUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(articleSkus).where(eq(articleSkus.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "SKU introuvable");
  const [modifie] = (await db.update(articleSkus).set(c.req.valid("json")).where(eq(articleSkus.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "article_sku.modifier", entiteType: "article_sku", entiteId: id, avant, apres: modifie });
  if (typeof c.req.valid("json").qte_stock === "number") {
    await verifierAutoEpuisement(modifie.article_coloris_id, utilisateur.id);
  }
  return c.json({ donnees: modifie });
});

catalogueRoutes.route("/skus", skusRoutes);
