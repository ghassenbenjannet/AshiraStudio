import { z } from "zod";
import { baseEntitySchema } from "./common.js";
import { LANGUES, ROLES_SYSTEME, VUE_BOARD, TYPE_PERSONNE, STATUT_AMBASSADEUR } from "../constants/enums.js";
import { MOTS_DE_PASSE_LONGUEUR_MIN } from "../constants/patterns.js";

/** §4.1 — Utilisateur (compte). */
export const utilisateurSchema = baseEntitySchema.extend({
  email: z.string().email(),
  nom: z.string().min(1).max(120),
  personne_id: z.string().uuid().nullable().optional(),
  role_systeme: z.enum(ROLES_SYSTEME),
  langue: z.enum(LANGUES).default("fr"),
  ical_token: z.string().length(32),
  vue_board_preferee: z.enum(VUE_BOARD).default("liste"),
  derniere_connexion: z.string().datetime({ offset: true }).nullable().optional(),
});
export type Utilisateur = z.infer<typeof utilisateurSchema>;
/** Représentation publique — jamais de password_hash renvoyé au client. */
export const utilisateurPublicSchema = utilisateurSchema;

export const utilisateurCreationSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(1).max(120),
  mot_de_passe: z.string().min(MOTS_DE_PASSE_LONGUEUR_MIN),
  role_systeme: z.enum(ROLES_SYSTEME),
  personne_id: z.string().uuid().nullable().optional(),
  langue: z.enum(LANGUES).optional(),
});

export const utilisateurUpdateSchema = z.object({
  nom: z.string().min(1).max(120).optional(),
  role_systeme: z.enum(ROLES_SYSTEME).optional(),
  langue: z.enum(LANGUES).optional(),
  vue_board_preferee: z.enum(VUE_BOARD).optional(),
  personne_id: z.string().uuid().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  mot_de_passe: z.string().min(1),
});

/** §2.1 — Catégories de contact : tags multiples cumulables, sans effet sur les permissions. */
export const categorieContactSchema = z.object({
  id: z.string().uuid(),
  nom: z.string().min(1).max(30),
  icone: z.string().max(60).nullable().optional(),
  systeme: z.boolean().default(false), // seed non supprimable, renommable
  ordre: z.number().int().nonnegative(),
});
export type CategorieContact = z.infer<typeof categorieContactSchema>;
export const categorieContactInsertSchema = categorieContactSchema.omit({ id: true });

const tailleCorpsSchema = z.object({
  taille_cm: z.string().nullable().optional(),
  haut: z.string().nullable().optional(),
  bas: z.string().nullable().optional(),
  chaussures: z.string().nullable().optional(),
});

const tarifPrestationSchema = z.object({
  prestation: z.string().min(1),
  tarif_dt: z.number().nonnegative(),
});

/** §4.1 — Personne (fiche référentiel, interne ou externe). RG-P1 : jamais supprimée, désactivée (actif=false). */
export const personneSchema = baseEntitySchema.extend({
  nom: z.string().min(1).max(120),
  categorie_ids: z.array(z.string().uuid()).min(1),
  type: z.enum(TYPE_PERSONNE),
  telephone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  instagram: z.string().max(60).nullable().optional(), // sans @
  ville: z.string().max(80).nullable().optional(),
  tarif_jour_dt: z.number().nonnegative().nullable().optional(),
  tarifs_prestations: z.array(tarifPrestationSchema).default([]),
  tailles: tailleCorpsSchema.default({}),
  portfolio_url: z.string().url().nullable().optional(),
  book_asset_ids: z.array(z.string().uuid()).default([]),
  materiel: z.string().max(500).nullable().optional(),
  styles: z.array(z.string()).default([]),
  specialites: z.array(z.string()).default([]),
  delai_moyen_jours: z.number().int().nonnegative().nullable().optional(),
  moq_habituel: z.number().int().nonnegative().nullable().optional(),
  conditions_paiement: z.string().max(300).nullable().optional(),
  disponibilites: z.string().max(300).nullable().optional(),
  note_5: z.number().min(0).max(5).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  actif: z.boolean().default(true),
});
export type Personne = z.infer<typeof personneSchema>;
export const personneInsertSchema = personneSchema.omit({ id: true, created_at: true, updated_at: true });
export const personneUpdateSchema = personneInsertSchema.partial();

const pieceAmbassadeurSchema = z.object({ article_sku_id: z.string().uuid() });
const postAmbassadeurSchema = z.object({
  date: z.string(),
  lien: z.string().url(),
  type: z.string().min(1),
});

/** §4.1 — Ambassadeur (extension 1-1 de personne). */
export const ambassadeurSchema = z.object({
  personne_id: z.string().uuid(),
  code_promo: z.string().min(1).max(30),
  statut: z.enum(STATUT_AMBASSADEUR),
  pieces: z.array(pieceAmbassadeurSchema).default([]),
  posts: z.array(postAmbassadeurSchema).default([]), // saisie manuelle
  ventes_attribuees_dt: z.number().nonnegative().default(0),
  notes: z.string().max(2000).nullable().optional(),
});
export type Ambassadeur = z.infer<typeof ambassadeurSchema>;
export const ambassadeurInsertSchema = ambassadeurSchema;
export const ambassadeurUpdateSchema = ambassadeurSchema.omit({ personne_id: true }).partial();
