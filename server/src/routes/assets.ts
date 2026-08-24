import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { inArray, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { assetInsertSchema, assetUpdateSchema, TYPE_ASSET, SOURCE_ASSET } from "@achirah/shared";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { enregistrerFichier } from "../lib/storage.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { listerAssets, utiliseDans, vientDe, quotasAssets, tagMasse } from "../services/assets.js";
import type { AppEnv } from "../types.js";

export const assetsRoutes = new Hono<AppEnv>();

// Lecture batch par ids (résolution asset_ids → objets, ex. photos coloris) — conservée de Phase ②.
assetsRoutes.get("/", async (c) => {
  const ids = c.req.query("ids")?.split(",").filter(Boolean);
  if (ids && ids.length > 0) {
    const lignes = await db.select().from(assets).where(inArray(assets.id, ids));
    return c.json({ donnees: lignes });
  }
  const { type, tag, campagne_id, article_coloris_id, createur_personne_id, q } = c.req.query();
  const lignes = await listerAssets({ type, tag, campagne_id, article_coloris_id, createur_personne_id, q });
  return c.json({ donnees: lignes });
});

assetsRoutes.get("/quotas", async (c) => c.json({ donnees: await quotasAssets() }));

assetsRoutes.get("/:id", async (c) => {
  const [asset] = await db.select().from(assets).where(eq(assets.id, c.req.param("id"))).limit(1);
  if (!asset) return erreurApi(c, 404, "introuvable", "Asset introuvable");
  return c.json({ donnees: asset });
});

assetsRoutes.get("/:id/liens", async (c) => {
  const id = c.req.param("id");
  const [utilise_dans, vient_de] = await Promise.all([utiliseDans(id), vientDe(id)]);
  return c.json({ donnees: { utilise_dans, vient_de } });
});

const champsUploadSchema = z.object({
  type: z.enum(TYPE_ASSET),
  source: z.enum(SOURCE_ASSET),
  nom: z.string().optional(),
  tags: z.string().optional(), // CSV
  campagne_ids: z.string().optional(), // CSV
  article_coloris_ids: z.string().optional(), // CSV
  createur_personne_ids: z.string().optional(), // CSV
  droits: z.string().optional(),
});
const csv = (v?: string) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);

// Upload multiple (drag & drop) : whitelist MIME stricte (§8.3, jpeg/png/webp/pdf ≤8 Mo) — la vidéo
// passe par POST /assets (référence externe), cf. DECISIONS.md Phase ④.
assetsRoutes.post("/upload", exigerCapacite("entites.editer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const corps = await c.req.parseBody({ all: true });
  const fichiers = ([] as File[]).concat((corps["fichiers"] as any) ?? []).filter((f): f is File => f instanceof File);
  if (fichiers.length === 0) return erreurApi(c, 400, "fichiers_requis", "Au moins un fichier requis (champ 'fichiers')");

  const analyse = champsUploadSchema.safeParse(corps);
  if (!analyse.success) return erreurApi(c, 422, "champs_invalides", analyse.error.issues[0]?.message ?? "Champs invalides");
  const champs = analyse.data;
  if (champs.source === "ugc" && !champs.droits) {
    return erreurApi(c, 422, "droits_requis", "Le champ « droits » est requis pour un asset UGC (RG-AS1)", "droits");
  }

  const crees: any[] = [];
  for (const fichier of fichiers) {
    try {
      const stocke = await enregistrerFichier(new Uint8Array(await fichier.arrayBuffer()), fichier.type);
      const [asset] = (await db
        .insert(assets)
        .values({
          type: champs.type,
          fichier_url: stocke.url,
          vignette_url: null,
          nom: champs.nom || fichier.name || `asset-${stocke.id}`,
          tags: csv(champs.tags),
          campagne_ids: csv(champs.campagne_ids),
          article_coloris_ids: csv(champs.article_coloris_ids),
          createur_personne_ids: csv(champs.createur_personne_ids),
          source: champs.source,
          droits: champs.droits ?? null,
        })
        .returning()) as any[];
      crees.push(asset);
      await enregistrerAudit({ utilisateurId: utilisateur.id, action: "asset.televerser", entiteType: "asset", entiteId: asset.id, apres: asset });
    } catch (err) {
      return erreurApi(c, 422, "fichier_invalide", err instanceof Error ? err.message : "Fichier invalide");
    }
  }
  return c.json({ donnees: crees }, 201);
});

// Référence externe (ex. vidéo hébergée ailleurs) — pas de fichier local, fichier_url = lien direct.
assetsRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", assetInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const corps = c.req.valid("json");
  if (corps.source === "ugc" && !corps.droits) {
    return erreurApi(c, 422, "droits_requis", "Le champ « droits » est requis pour un asset UGC (RG-AS1)", "droits");
  }
  const [cree] = (await db.insert(assets).values(corps).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "asset.creer", entiteType: "asset", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

assetsRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", assetUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Asset introuvable");
  const [modifie] = (await db.update(assets).set(c.req.valid("json")).where(eq(assets.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "asset.modifier", entiteType: "asset", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

const masseSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  tags: z.array(z.string()).optional(),
  campagne_ids: z.array(z.string().uuid()).optional(),
  article_coloris_ids: z.array(z.string().uuid()).optional(),
});
assetsRoutes.post("/masse", exigerCapacite("entites.editer"), zValidator("json", masseSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const { ids, ...ajout } = c.req.valid("json");
  const maj = await tagMasse(ids, ajout);
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "asset.rattachement_masse", entiteType: "asset", apres: { ids, ajout } });
  return c.json({ donnees: maj });
});
