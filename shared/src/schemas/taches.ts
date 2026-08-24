import { z } from "zod";
import { baseEntitySchema, checklistItemSchema } from "./common.js";
import {
  TYPE_TACHE,
  STATUT_TACHE,
  HEURE_LUMIERE,
  AUTORISATION_LIEU,
  STATUT_POST_PROD,
  SORT_RETOUR_PIECE,
  SOURCE_LOOK_ITEM,
  SLOT_LOOK,
} from "../constants/enums.js";

/** §4.4 — Tâche. "En retard" jamais stocké (RG-T1), calculé à l'affichage. */
export const tacheSchema = baseEntitySchema.extend({
  campagne_id: z.string().uuid(),
  titre: z.string().min(1).max(120),
  type: z.enum(TYPE_TACHE),
  date_echeance: z.string(),
  assigne_ids: z.array(z.string().uuid()).default([]),
  lieu: z.string().max(200).nullable(),
  statut: z.enum(STATUT_TACHE).default("todo"),
  done_at: z.string().datetime({ offset: true }).nullable(),
  description: z.string().max(2000).nullable(),
});
export type Tache = z.infer<typeof tacheSchema>;
export const tacheInsertSchema = tacheSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  statut: true,
  done_at: true,
});
export const tacheUpdateSchema = tacheInsertSchema.partial();

export function tacheEnRetard(tache: Pick<Tache, "statut" | "date_echeance">, aujourdhuiIso: string): boolean {
  return tache.statut !== "fait" && tache.date_echeance < aujourdhuiIso;
}

const piecesApporterSchema = z.object({ article_sku_id: z.string().uuid(), note: z.string().max(200).optional() });
const retourPieceSchema = z.object({
  article_sku_id: z.string().uuid(),
  sort: z.enum(SORT_RETOUR_PIECE),
  garde_par_personne_id: z.string().uuid().optional(),
});

/** §4.4 — Shooting, extension 1-1 de tache (type=shooting), cascade delete avec la tâche. */
export const shootingSchema = z.object({
  tache_id: z.string().uuid(),
  photographe_id: z.string().uuid().nullable(),
  modele_ids: z.array(z.string().uuid()).default([]),
  decor: z.string().max(300).nullable(),
  heure_lumiere: z.enum(HEURE_LUMIERE).nullable(),
  duree_min: z.number().int().positive().default(180),
  moodboard_board_id: z.string().uuid().nullable(),
  refs_visuelles: z.array(z.string().uuid()).max(6).default([]), // 3-6 images
  autorisation_lieu: z.enum(AUTORISATION_LIEU).default("non_requise"),
  autorisation_lieu_note: z.string().max(300).nullable(),
  plan_b_lieu: z.string().max(300).nullable(),
  grooming: z.string().max(300).nullable(),
  pieces: z.array(piecesApporterSchema).default([]), // agrégée auto depuis les looks (RG-LK1), ajout manuel possible
  materiel: z.array(checklistItemSchema).default([]), // pré-remplie depuis modèle de checklist
  preparation_pieces: z.array(checklistItemSchema).default([]), // auto-générée par pièce
  retour_pieces: z.array(retourPieceSchema).default([]),
  livrable_photos: z.string().max(500).nullable(),
  livrable_videos: z.string().max(500).nullable(),
  statut_post_prod: z.enum(STATUT_POST_PROD).default("a_trier"),
  nb_photos_recues: z.number().int().nonnegative().nullable(),
  notes: z.string().max(2000).nullable(),
});
export type Shooting = z.infer<typeof shootingSchema>;
export const shootingUpdateSchema = shootingSchema.omit({ tache_id: true }).partial();

/** Indicateur "Prêt à tourner" — jamais bloquant (RG-S3). */
export interface PretATourner {
  pret: boolean;
  manques: string[];
}
export function calculerPretATourner(input: {
  nbPieces: number;
  photographeId: string | null;
  nbPoses: number;
  dateEcheance: string | null;
  lieu: string | null;
}): PretATourner {
  const manques: string[] = [];
  if (input.nbPieces < 1) manques.push("pieces");
  if (!input.photographeId) manques.push("photographe");
  if (input.nbPoses < 1) manques.push("poses");
  if (!input.dateEcheance) manques.push("date");
  if (!input.lieu) manques.push("lieu");
  return { pret: manques.length === 0, manques };
}

/** §4.4 — Look. */
export const lookSchema = z.object({
  id: z.string().uuid(),
  shooting_id: z.string().uuid(),
  nom: z.string().min(1).max(60),
  ordre: z.number().int().nonnegative(),
  note: z.string().max(300).nullable(),
});
export type Look = z.infer<typeof lookSchema>;
export const lookInsertSchema = lookSchema.omit({ id: true });
export const lookUpdateSchema = lookInsertSchema.omit({ shooting_id: true }).partial();

/** §4.4 — Item de look. Multi-items par slot (superposition). */
export const lookItemSchema = z.object({
  id: z.string().uuid(),
  look_id: z.string().uuid(),
  slot: z.enum(SLOT_LOOK),
  source: z.enum(SOURCE_LOOK_ITEM),
  article_coloris_id: z.string().uuid().nullable(),
  photo_asset_id: z.string().uuid().nullable(),
  texte: z.string().max(300).nullable(),
  note: z.string().max(200).nullable(),
  ordre: z.number().int().nonnegative(),
});
export type LookItem = z.infer<typeof lookItemSchema>;
export const lookItemInsertSchema = lookItemSchema.omit({ id: true });
export const lookItemUpdateSchema = lookItemInsertSchema.omit({ look_id: true }).partial();

/** §4.4 — Pose (shot list). */
export const poseSchema = z.object({
  id: z.string().uuid(),
  shooting_id: z.string().uuid(),
  ordre: z.number().int().nonnegative(),
  description: z.string().min(1).max(200),
  article_coloris_id: z.string().uuid().nullable(),
  look_id: z.string().uuid().nullable(),
  duree_min: z.number().int().positive().nullable(),
});
export type Pose = z.infer<typeof poseSchema>;
export const poseInsertSchema = poseSchema.omit({ id: true });
export const poseUpdateSchema = poseInsertSchema.omit({ shooting_id: true }).partial();
