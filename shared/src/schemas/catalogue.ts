import { z } from "zod";
import { baseEntitySchema } from "./common.js";
import { REFERENCE_ARTICLE_REGEX } from "../constants/patterns.js";
import { FIT_ARTICLE, STATUT_CYCLE_ARTICLE, STATUT_ARTICLE_COLORIS, type StatutCycleArticle } from "../constants/enums.js";

const compositionSchema = z
  .array(z.object({ matiere_id: z.string().uuid(), pct: z.number().min(0).max(100) }))
  .refine((arr) => arr.length === 0 || arr.reduce((s, c) => s + c.pct, 0) === 100, {
    message: "La composition doit totaliser 100%",
  });

/** §4.2 — Article (niveau MODÈLE). Référence et gamme immuables après création (RG-A1). */
export const articleSchema = baseEntitySchema.extend({
  reference: z.string().regex(REFERENCE_ARTICLE_REGEX),
  nom: z.string().min(1).max(120),
  gamme_id: z.string().uuid(),
  categorie_id: z.string().uuid(),
  chapitre_id: z.string().uuid().nullable().optional(), // campagne
  fit: z.enum(FIT_ARTICLE).nullable().optional(),
  description_commerciale: z.string().max(400).nullable().optional(),
  composition: compositionSchema.default([]),
  grammage_gsm: z.number().int().min(80).max(800).nullable().optional(),
  entretien_codes: z.array(z.string().uuid()).default([]),
  numerote: z.boolean().default(false),
  numerotation_total: z.number().int().positive().nullable().optional(),
  fournisseur_id: z.string().uuid().nullable().optional(),
  delai_production_jours: z.number().int().nonnegative().nullable().optional(),
  moq: z.number().int().nonnegative().nullable().optional(),
  statut_cycle: z.enum(STATUT_CYCLE_ARTICLE).default("idee"),
  notes_interne: z.string().max(2000).nullable().optional(),
});
export type Article = z.infer<typeof articleSchema>;
export const articleInsertSchema = articleSchema.omit({ id: true, created_at: true, updated_at: true, statut_cycle: true });
export const articleUpdateSchema = articleInsertSchema
  .omit({ reference: true, gamme_id: true }) // immuables (RG-A1)
  .partial();

/** §4.2 — Coloris d'un article (niveau COLORIS). */
export const articleColorisSchema = baseEntitySchema.extend({
  article_id: z.string().uuid(),
  coloris_id: z.string().uuid(),
  photos: z.array(z.string().uuid()).default([]), // asset_ids ordonnées : face, dos, détail, porté
  prix_dt: z.number().nonnegative().nullable().optional(), // hérite du modèle si null
  statut: z.enum(STATUT_ARTICLE_COLORIS).default("actif"),
  ordre: z.number().int().nonnegative(),
});
export type ArticleColoris = z.infer<typeof articleColorisSchema>;
export const articleColorisInsertSchema = articleColorisSchema.omit({ id: true, created_at: true, updated_at: true });
export const articleColorisUpdateSchema = articleColorisInsertSchema.partial();

const mesuresSchema = z.record(z.string(), z.number().positive());

/** §4.2 — SKU (niveau taille). SKU affiché : `SG-01-NOI-42`. */
export const articleSkuSchema = baseEntitySchema.extend({
  article_coloris_id: z.string().uuid(),
  taille: z.string().min(1),
  qte_produite: z.number().int().nonnegative().default(0),
  qte_stock: z.number().int().nonnegative().default(0), // manuel, ou Shopify si connecté
  mesures: mesuresSchema.default({}), // cm — gabarit selon la catégorie (poitrine, épaules, longueur, manche / taille, hanches, entrejambe, ouverture, longueur / tour de tête)
});
export type ArticleSku = z.infer<typeof articleSkuSchema>;
export const articleSkuInsertSchema = articleSkuSchema.omit({ id: true, created_at: true, updated_at: true });
export const articleSkuUpdateSchema = articleSkuInsertSchema.partial();

/** Nombre de SKU (toutes tailles/colorís confondus) avec au moins une mesure renseignée — même
 *  compteur que celui qui bloque la transition `fit_valide` (`transitionnerArticle`, RG du §4.2) et
 *  que celui qui alimente le bandeau « Prochaine étape » d'un article `prototype` (CR-02 §C) : un
 *  seul endroit de vérité, le seuil (3) reste défini une seule fois côté serveur. */
export const SKUS_AVEC_MESURES_REQUIS = 3;
export function compterSkusAvecMesures(skus: Pick<ArticleSku, "mesures">[]): number {
  return skus.filter((s) => Object.keys(s.mesures).length > 0).length;
}

/** §4.2 — COGS. Marge toujours calculée, jamais saisie. Visible admin uniquement. */
export const articleCoutSchema = z.object({
  article_id: z.string().uuid(),
  tissu_dt: z.number().nonnegative().default(0),
  faconnage_dt: z.number().nonnegative().default(0),
  fournitures_dt: z.number().nonnegative().default(0),
  packaging_dt: z.number().nonnegative().default(0),
  transport_unitaire_dt: z.number().nonnegative().default(0),
  autre_dt: z.number().nonnegative().default(0),
});
export type ArticleCout = z.infer<typeof articleCoutSchema>;
export const articleCoutUpsertSchema = articleCoutSchema.omit({ article_id: true });

export function calculerCogs(cout: Omit<ArticleCout, "article_id">): number {
  return (
    cout.tissu_dt + cout.faconnage_dt + cout.fournitures_dt + cout.packaging_dt + cout.transport_unitaire_dt + cout.autre_dt
  );
}

/** marge % = (prix - COGS) / prix — toujours calculée, jamais saisie (§4.2). */
export function calculerMargePct(prixDt: number, cogsDt: number): number | null {
  if (prixDt <= 0) return null;
  return ((prixDt - cogsDt) / prixDt) * 100;
}

export type PastilleMarge = "vert" | "orange" | "rouge";

/** Seuils par défaut globaux 60/45, surchargés par la cible de gamme (marge_cible_pct). */
export function pastilleMarge(margePct: number | null, margeCiblePct: number, seuilOrange: number): PastilleMarge {
  if (margePct === null) return "rouge";
  if (margePct >= margeCiblePct) return "vert";
  if (margePct >= seuilOrange) return "orange";
  return "rouge";
}

/**
 * RG-A10 (Lot 1.1) : date au-delà de laquelle le lancement en production d'un article met en danger
 * le drop de son chapitre — `date_drop` = `date_fin` de la campagne (le jalon « Drop » du rituel est
 * à l'offset 0 de `date_fin`, §5.7 seed). Le tampon de 7 j est déjà intégré dans cette limite.
 */
export function limiteLancementProduction(dateDrop: string, delaiProductionJours: number): Date {
  const d = new Date(dateDrop);
  d.setDate(d.getDate() - delaiProductionJours - 7);
  return d;
}

/**
 * RG-A10 : vrai à partir de J-7 de `limiteLancementProduction`, tant que `statut_cycle` n'a pas
 * encore atteint `production` — c'est la condition qui déclenche la génération d'une tâche d'alerte
 * (jamais une simple notification). Idempotence : à la charge de l'appelant (une seule tâche par
 * article et par chapitre, jamais recréée si elle existe déjà).
 */
export function alerteLancementProductionRequise(
  aujourdhui: string,
  dateDrop: string,
  delaiProductionJours: number,
  statutCycle: StatutCycleArticle,
): boolean {
  if (STATUT_CYCLE_ARTICLE.indexOf(statutCycle) >= STATUT_CYCLE_ARTICLE.indexOf("production")) return false;
  const dateAlerte = limiteLancementProduction(dateDrop, delaiProductionJours);
  dateAlerte.setDate(dateAlerte.getDate() - 7);
  return aujourdhui >= dateAlerte.toISOString().slice(0, 10);
}

export const historiqueStatutSchema = z.object({
  id: z.string().uuid(),
  article_id: z.string().uuid(),
  de: z.enum(STATUT_CYCLE_ARTICLE).nullable().optional(),
  vers: z.enum(STATUT_CYCLE_ARTICLE),
  at: z.string().datetime({ offset: true }),
  par: z.string().uuid(),
});
export type HistoriqueStatut = z.infer<typeof historiqueStatutSchema>;

/** Import CSV (§4.2) : en-têtes attendues, 4 premières requises, insensibles à la casse. */
export const ARTICLE_IMPORT_HEADERS = [
  "reference",
  "nom",
  "gamme",
  "prix",
  "categorie",
  "matiere",
  "tailles",
  "numerote",
  "numerotation_total",
  "statut",
  "notes",
] as const;
export const ARTICLE_IMPORT_HEADERS_REQUISES = ["reference", "nom", "gamme", "prix"] as const;

export const articleImportLigneSchema = z.object({
  reference: z.string(),
  nom: z.string(),
  gamme: z.string(),
  prix: z.string(),
  categorie: z.string().optional(),
  matiere: z.string().optional(),
  tailles: z.string().optional(),
  numerote: z.string().optional(),
  numerotation_total: z.string().optional(),
  statut: z.string().optional(),
  notes: z.string().optional(),
});
export type ArticleImportLigne = z.infer<typeof articleImportLigneSchema>;

export type ArticleImportAction = "nouveau" | "mise_a_jour" | "erreur";
export interface ArticleImportResultatLigne {
  ligne: number;
  action: ArticleImportAction;
  motif?: string;
  donnees: ArticleImportLigne;
}
