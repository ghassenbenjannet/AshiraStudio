import { z } from "zod";
import { baseEntitySchema } from "./common.js";
import { STATUT_CAMPAGNE, OBJECTIF_CAMPAGNE, SOURCE_CAMPAGNE_ARTICLE } from "../constants/enums.js";

const kpiCiblesSchema = z.object({
  ca_dt: z.number().nonnegative().optional(),
  commandes: z.number().int().nonnegative().optional(),
  reach: z.number().int().nonnegative().optional(),
  roas: z.number().nonnegative().optional(),
  ugc: z.number().int().nonnegative().optional(),
});

const rapportCampagneSchema = z.object({
  marche: z.string().min(1),
  pas_marche: z.string().min(1),
  decisions: z.string().min(1),
});

/** §4.3 — Campagne, hub central. RG-ECO1 : kpi_cibles verrouillées au passage `active`. */
export const campagneSchema = baseEntitySchema.extend({
  nom: z.string().min(1).max(150),
  type_campagne_id: z.string().uuid(),
  occasion_id: z.string().uuid().nullable().optional(),
  date_debut: z.string(),
  date_fin: z.string(),
  statut: z.enum(STATUT_CAMPAGNE).default("preparation"),
  objectif: z.enum(OBJECTIF_CAMPAGNE),
  objectif_texte: z.string().max(500).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  budget_total_dt: z.number().nonnegative().default(0),
  canaux: z.array(z.string().uuid()).default([]),
  kpi_cibles: kpiCiblesSchema.default({}),
  kpi_cibles_verrouillees: z.boolean().default(false),
  resultats: z.record(z.string(), z.unknown()).default({}),
  rapport: rapportCampagneSchema.nullable().optional(),
});
export type Campagne = z.infer<typeof campagneSchema>;
export const campagneInsertSchema = campagneSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  statut: true,
  kpi_cibles_verrouillees: true,
  resultats: true,
  rapport: true,
});
/**
 * `statut` et `resultats` sont exclus de l'insert (une campagne naît toujours `preparation`, sans
 * résultats) mais doivent rester modifiables ensuite : `livree`/`abandonnee`/`preparation` via ce
 * PATCH générique, `active` et `fermee` réservés aux endpoints dédiés (verrouillage KPI, rapport —
 * RG-ECO1/ECO2), appliqué côté serveur. `resultats` alimente le Rapport de campagne (chiffres en
 * face des cibles) avant fermeture.
 */
export const campagneUpdateSchema = campagneInsertSchema.partial().extend({
  statut: z.enum(STATUT_CAMPAGNE).optional(),
  resultats: z.record(z.string(), z.unknown()).optional(),
});

export const campagneFermetureSchema = z.object({ rapport: rapportCampagneSchema });

/** RG-ECO2 — clés de `kpi_cibles` sans résultat correspondant dans `resultats`. Fonction pure
 *  partagée : c'est la même liste qui bloque `fermerCampagne` (livree→fermee) et qui alimente le
 *  bandeau « Prochaine étape » d'une campagne `livree` (CR-02 §C) — un seul endroit de vérité. */
export function campagneResultatsManquants(campagne: Pick<Campagne, "kpi_cibles" | "resultats">): string[] {
  return Object.keys(campagne.kpi_cibles).filter((cle) => campagne.resultats[cle] === undefined || campagne.resultats[cle] === null);
}

/** §4.3 — Ligne article de campagne : catalogue, lien Achirah, photo, ou texte libre. */
export const campagneArticleSchema = baseEntitySchema.extend({
  campagne_id: z.string().uuid(),
  source: z.enum(SOURCE_CAMPAGNE_ARTICLE),
  article_coloris_id: z.string().uuid().nullable().optional(),
  url: z.string().url().nullable().optional(),
  titre_extrait: z.string().max(200).nullable().optional(),
  image_extraite_url: z.string().url().nullable().optional(),
  photo_asset_id: z.string().uuid().nullable().optional(),
  texte: z.string().max(500).nullable().optional(),
  ordre: z.number().int().nonnegative(),
});
export type CampagneArticle = z.infer<typeof campagneArticleSchema>;
export const campagneArticleInsertSchema = campagneArticleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

/** Champ d'ajout intelligent — discriminé côté serveur (URL Achirah / texte / photo). */
export const ajoutIntelligentSchema = z.union([
  z.object({ mode: z.literal("catalogue"), article_coloris_id: z.string().uuid() }),
  z.object({ mode: z.literal("lien"), url: z.string().url() }),
  z.object({ mode: z.literal("texte"), texte: z.string().min(1).max(500) }),
  z.object({ mode: z.literal("photo"), photo_asset_id: z.string().uuid() }),
]);
export type AjoutIntelligent = z.infer<typeof ajoutIntelligentSchema>;

/** §4.3 — Ligne budgétaire. Écriture réservée admin (§2.1). */
export const budgetLigneSchema = baseEntitySchema.extend({
  campagne_id: z.string().uuid(),
  poste_id: z.string().uuid(),
  libelle: z.string().min(1).max(150),
  prevu_dt: z.number().nonnegative().default(0),
  engage_dt: z.number().nonnegative().default(0),
  reel_dt: z.number().nonnegative().default(0),
  personne_id: z.string().uuid().nullable().optional(),
  justificatif_asset_id: z.string().uuid().nullable().optional(),
});
export type BudgetLigne = z.infer<typeof budgetLigneSchema>;
export const budgetLigneInsertSchema = budgetLigneSchema.omit({ id: true, created_at: true, updated_at: true });
export const budgetLigneUpdateSchema = budgetLigneInsertSchema.partial();
