import { z } from "zod";
import { baseEntitySchema } from "./common.js";
import {
  TYPE_CONTENU,
  STATUT_CONTENU,
  TYPE_ASSET,
  SOURCE_ASSET,
  TYPE_BOARD_ITEM,
  SOURCE_IDEE,
  STATUT_IDEE,
} from "../constants/enums.js";
import { DIMENSIONS_GATE } from "../constants/enums.js";

const resultatsContenuSchema = z.object({
  reach: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  saves: z.number().int().nonnegative().optional(),
  shares: z.number().int().nonnegative().optional(),
});

const scoreDetailDimensionSchema = z.object({
  dimension: z.enum(DIMENSIONS_GATE),
  score: z.number().min(0).max(2),
  raison: z.string(),
  correction: z.string().optional(),
});
export type ScoreDetailDimension = z.infer<typeof scoreDetailDimensionSchema>;

/** §4.5 — Contenu. Gate auto au passage brouillon->en_revue (§6.6). */
export const contenuSchema = baseEntitySchema.extend({
  campagne_id: z.string().uuid(),
  type: z.enum(TYPE_CONTENU),
  plateformes: z.array(z.string().uuid()).default([]),
  titre: z.string().min(1).max(150),
  caption: z.string().max(4000),
  registre_id: z.string().uuid().nullable(),
  date_publication: z.string().datetime({ offset: true }).nullable(),
  statut: z.enum(STATUT_CONTENU).default("brouillon"),
  asset_ids: z.array(z.string().uuid()).default([]),
  article_coloris_ids: z.array(z.string().uuid()).default([]),
  auteur_id: z.string().uuid(),
  approbateur_id: z.string().uuid().nullable(),
  publie_le: z.string().datetime({ offset: true }).nullable(),
  resultats: resultatsContenuSchema.nullable(),
  score_marque: z.number().min(0).max(10).nullable(),
  score_detail: z.array(scoreDetailDimensionSchema).nullable(),
  cree_par_agent: z.boolean().default(false), // RG-AGW6, marqueur 48h côté UI calculé depuis created_at
});
export type Contenu = z.infer<typeof contenuSchema>;
export const contenuInsertSchema = contenuSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  statut: true,
  publie_le: true,
  score_marque: true,
  score_detail: true,
});
export const contenuUpdateSchema = contenuInsertSchema.partial();

export const contenuVersionSchema = z.object({
  id: z.string().uuid(),
  contenu_id: z.string().uuid(),
  caption: z.string(),
  at: z.string().datetime({ offset: true }),
  par: z.string().uuid(),
});
export type ContenuVersion = z.infer<typeof contenuVersionSchema>;

/** §4.5 — Asset. */
export const assetSchema = baseEntitySchema.extend({
  type: z.enum(TYPE_ASSET),
  fichier_url: z.string().min(1),
  vignette_url: z.string().min(1).nullable(),
  nom: z.string().min(1).max(200),
  tags: z.array(z.string()).default([]),
  campagne_ids: z.array(z.string().uuid()).default([]),
  article_coloris_ids: z.array(z.string().uuid()).default([]),
  shooting_id: z.string().uuid().nullable(),
  createur_personne_ids: z.array(z.string().uuid()).default([]),
  source: z.enum(SOURCE_ASSET),
  droits: z.string().max(300).nullable(), // RG-AS1 : requis pour UGC avant approbation d'un contenu qui l'utilise
});
export type Asset = z.infer<typeof assetSchema>;
export const assetInsertSchema = assetSchema.omit({ id: true, created_at: true, updated_at: true });
export const assetUpdateSchema = assetInsertSchema.partial();

const boardItemSchema = z.object({
  id: z.string(),
  type: z.enum(TYPE_BOARD_ITEM),
  contenu: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  couleur: z.string().nullable().optional(),
});
export type BoardItem = z.infer<typeof boardItemSchema>;

/** §4.5 — Board (canvas libre). */
export const boardSchema = baseEntitySchema.extend({
  nom: z.string().min(1).max(150),
  campagne_id: z.string().uuid().nullable(),
  items: z.array(boardItemSchema).default([]),
});
export type Board = z.infer<typeof boardSchema>;
export const boardInsertSchema = boardSchema.omit({ id: true, created_at: true, updated_at: true });
export const boardUpdateSchema = boardInsertSchema.partial();

/** §4.5 — Idée. */
export const ideeSchema = baseEntitySchema.extend({
  contenu: z.string().min(1), // markdown léger
  source: z.enum(SOURCE_IDEE),
  article_coloris_id: z.string().uuid().nullable(),
  tache_id: z.string().uuid().nullable(),
  statut: z.enum(STATUT_IDEE).default("nouvelle"),
  score: z.number().min(0).max(100).nullable(),
  score_justification: z.string().nullable(),
});
export type Idee = z.infer<typeof ideeSchema>;
export const ideeInsertSchema = ideeSchema.omit({ id: true, created_at: true, updated_at: true, statut: true });
export const ideeUpdateSchema = ideeInsertSchema.partial();

/** §4.5 — Générateur d'idées scorées : entrée. */
export const genererIdeesEntreeSchema = z.object({
  objectif: z.string().min(1),
  plateformes: z.array(z.string().uuid()).min(1),
  articles: z.array(z.string().uuid()).optional(),
  effort: z.enum(["facile", "moyen", "lourd"]),
  quantite: z.number().int().min(3).max(10),
  campagne_id: z.string().uuid().optional(),
});
export type GenererIdeesEntree = z.infer<typeof genererIdeesEntreeSchema>;

export const ideeGenereeSchema = z.object({
  hook: z.string(),
  storyboard: z.string(),
  plans_a_filmer: z.array(z.string()),
  duree: z.string(),
  caption: z.string(),
  son: z.string().nullable(),
  lieu: z.string().nullable(),
  pieces: z.array(z.string()),
  score: z.number().min(0).max(100),
  score_justification: z.string(),
});
export type IdeeGeneree = z.infer<typeof ideeGenereeSchema>;
