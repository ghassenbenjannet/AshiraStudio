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
  occasion_id: z.string().uuid().nullable(),
  date_debut: z.string(),
  date_fin: z.string(),
  statut: z.enum(STATUT_CAMPAGNE).default("preparation"),
  objectif: z.enum(OBJECTIF_CAMPAGNE),
  objectif_texte: z.string().max(500).nullable(),
  description: z.string().max(4000).nullable(),
  budget_total_dt: z.number().nonnegative().default(0),
  canaux: z.array(z.string().uuid()).default([]),
  kpi_cibles: kpiCiblesSchema.default({}),
  kpi_cibles_verrouillees: z.boolean().default(false),
  resultats: z.record(z.string(), z.unknown()).default({}),
  rapport: rapportCampagneSchema.nullable(),
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
export const campagneUpdateSchema = campagneInsertSchema.partial();

export const campagneFermetureSchema = z.object({ rapport: rapportCampagneSchema });

/** §4.3 — Ligne article de campagne : catalogue, lien Achirah, photo, ou texte libre. */
export const campagneArticleSchema = baseEntitySchema.extend({
  campagne_id: z.string().uuid(),
  source: z.enum(SOURCE_CAMPAGNE_ARTICLE),
  article_coloris_id: z.string().uuid().nullable(),
  url: z.string().url().nullable(),
  titre_extrait: z.string().max(200).nullable(),
  image_extraite_url: z.string().url().nullable(),
  photo_asset_id: z.string().uuid().nullable(),
  texte: z.string().max(500).nullable(),
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
  personne_id: z.string().uuid().nullable(),
  justificatif_asset_id: z.string().uuid().nullable(),
});
export type BudgetLigne = z.infer<typeof budgetLigneSchema>;
export const budgetLigneInsertSchema = budgetLigneSchema.omit({ id: true, created_at: true, updated_at: true });
export const budgetLigneUpdateSchema = budgetLigneInsertSchema.partial();
