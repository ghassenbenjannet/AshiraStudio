import { z } from "zod";
import { archivableEntitySchema } from "./common.js";
import { CODE_PREFIXE_GAMME_REGEX, CODE_COLORIS_REGEX, HEX_COLOR_REGEX } from "../constants/patterns.js";
import { GABARIT_MESURES, SLOT_LOOK } from "../constants/enums.js";

/** §5.0 — Gammes. RG-PARAM2 : le produit ne connaît aucune marque, STREET/SIGNATURE ne sont que des valeurs de seed. */
export const gammeSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  code_prefixe: z.string().regex(CODE_PREFIXE_GAMME_REGEX, "2-3 lettres majuscules"),
  couleur: z.string().regex(HEX_COLOR_REGEX).nullable(),
  alerte_baisse_prix: z.boolean().default(false),
  message_alerte: z.string().max(200).nullable(),
  marge_cible_pct: z.number().min(0).max(100).default(60),
  ordre: z.number().int().nonnegative(),
});
export type Gamme = z.infer<typeof gammeSchema>;
export const gammeInsertSchema = gammeSchema.omit({ id: true, created_at: true, updated_at: true, archived_at: true });
export const gammeUpdateSchema = gammeInsertSchema.partial().extend({
  // code_prefixe devient immuable dès le premier article créé — appliqué côté serveur, pas ici
});

/** §5.1 — Catégories produit : le lien catégorie -> grille -> gabarit est le cœur du paramétrage. */
export const categorieProduitSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  slot_look: z.enum(SLOT_LOOK),
  grille_tailles_id: z.string().uuid(),
  grille_tailles_id_secondaire: z.string().uuid().nullable(), // pour les "Set" (grilles doubles)
  gabarit_mesures: z.enum(GABARIT_MESURES),
  ordre: z.number().int().nonnegative(),
});
export type CategorieProduit = z.infer<typeof categorieProduitSchema>;
export const categorieProduitInsertSchema = categorieProduitSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});

/** §5.2 — Coloris. */
export const colorisSchema = archivableEntitySchema.extend({
  nom_commercial: z.string().min(1).max(60),
  code_3l: z.string().regex(CODE_COLORIS_REGEX),
  hex: z.string().regex(HEX_COLOR_REGEX),
});
export type Coloris = z.infer<typeof colorisSchema>;
export const colorisInsertSchema = colorisSchema.omit({ id: true, created_at: true, updated_at: true, archived_at: true });

/** §5.3 — Matières. */
export const matiereSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  nom_ar: z.string().max(60).nullable(),
  note: z.string().max(500).nullable(),
});
export type Matiere = z.infer<typeof matiereSchema>;
export const matiereInsertSchema = matiereSchema.omit({ id: true, created_at: true, updated_at: true, archived_at: true });

/** §5.4 — Codes d'entretien. */
export const codeEntretienSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  icone: z.string().max(60).nullable(),
  ordre: z.number().int().nonnegative(),
});
export type CodeEntretien = z.infer<typeof codeEntretienSchema>;
export const codeEntretienInsertSchema = codeEntretienSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});

/** §5.5 — Grilles de tailles. */
export const grilleTailleSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  valeurs: z.array(z.string().min(1)).min(1),
});
export type GrilleTaille = z.infer<typeof grilleTailleSchema>;
export const grilleTailleInsertSchema = grilleTailleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});

/** §5.6 — Listes diverses : postes budgétaires, canaux, plateformes de contenu, occasions commerciales. */
export const listeSimpleSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  ordre: z.number().int().nonnegative(),
});
export type ListeSimple = z.infer<typeof listeSimpleSchema>;
export const listeSimpleInsertSchema = listeSimpleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});

/** §5.6 — Modèles de checklists (Matériel shooting, Préparation pièces, Checklist drop). */
export const modeleChecklistSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  items: z.array(z.string().min(1)),
  ordre: z.number().int().nonnegative(),
});
export type ModeleChecklist = z.infer<typeof modeleChecklistSchema>;
export const modeleChecklistInsertSchema = modeleChecklistSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});

/** §5.7 — Registres de langue. L'arbitrage registre x gamme vit dans brand-brain.md (contenu, pas code). */
export const registreSchema = archivableEntitySchema.extend({
  code: z.string().min(1).max(10),
  nom: z.string().min(1).max(60),
  description: z.string().max(300),
  ordre: z.number().int().nonnegative(),
});
export type Registre = z.infer<typeof registreSchema>;
export const registreInsertSchema = registreSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});

/** §5.7 — Types de campagne. */
export const typeCampagneSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  modele_rituel_id: z.string().uuid().nullable(),
  ordre: z.number().int().nonnegative(),
});
export type TypeCampagne = z.infer<typeof typeCampagneSchema>;
export const typeCampagneInsertSchema = typeCampagneSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});

/** §5.7 — Modèles de rituel : jalons offsets relatifs à la date de fin de campagne. */
export const jalonRituelSchema = z.object({
  id: z.string(),
  libelle: z.string().min(1).max(100),
  offset_jours: z.number().int(), // relatif à la date de fin (négatif = avant, positif = après)
  type_tache: z.string().min(1), // référence libre au type de tâche généré
});
export type JalonRituel = z.infer<typeof jalonRituelSchema>;

export const modeleRituelSchema = archivableEntitySchema.extend({
  nom: z.string().min(1).max(60),
  jalons: z.array(jalonRituelSchema),
});
export type ModeleRituel = z.infer<typeof modeleRituelSchema>;
export const modeleRituelInsertSchema = modeleRituelSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  archived_at: true,
});
