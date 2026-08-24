import { z } from "zod";
import { baseEntitySchema } from "./common.js";
import {
  TYPE_RECOMMANDATION,
  IMPACT_RECOMMANDATION,
  STATUT_RECOMMANDATION,
  SOURCE_TENDANCE,
  CATEGORIE_TENDANCE,
  MATURITE_TENDANCE,
  STATUT_TENDANCE,
  STATUT_EXPRESSION,
  TYPE_LECON,
  STATUT_LECON,
} from "../constants/enums.js";

const sourceDonneesSchema = z.array(
  z.object({ libelle: z.string(), valeur: z.string(), date: z.string() }),
);

/** §4.7 — Recommandation GROW. Plafonnée à 5 actives (RG-G1). */
export const recommandationSchema = baseEntitySchema.extend({
  type: z.enum(TYPE_RECOMMANDATION),
  titre: z.string().min(1).max(150),
  justification: z.string().min(1),
  source_donnees: sourceDonneesSchema.default([]),
  impact: z.enum(IMPACT_RECOMMANDATION),
  statut: z.enum(STATUT_RECOMMANDATION).default("nouvelle"),
});
export type Recommandation = z.infer<typeof recommandationSchema>;
export const recommandationUpdateSchema = z.object({ statut: z.enum(STATUT_RECOMMANDATION) });

const scoresTendanceSchema = z.object({
  tunisia_fit: z.number().min(0).max(10),
  achirah_fit: z.number().min(0).max(10),
  audience_fit: z.number().min(0).max(10),
  maturite: z.enum(MATURITE_TENDANCE),
});

/** §4.7 — Tendance. Recherche web via IA avec sources citées (RG-TR1), sinon badge "non vérifiée". */
export const tendanceSchema = baseEntitySchema.extend({
  source: z.enum(SOURCE_TENDANCE),
  categorie: z.enum(CATEGORIE_TENDANCE),
  titre: z.string().min(1).max(150),
  description: z.string().min(1),
  lien: z.string().url().nullable().optional(),
  source_verifiee: z.boolean().default(true), // false => badge "non vérifiée" (RG-TR1)
  scores: scoresTendanceSchema,
  statut: z.enum(STATUT_TENDANCE).default("a_evaluer"),
  adaptation: z.string().nullable().optional(),
});
export type Tendance = z.infer<typeof tendanceSchema>;
export const tendanceInsertSchema = tendanceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  statut: true,
});
export const tendanceUpdateSchema = tendanceInsertSchema.partial();

/** §4.7 — Concurrent + relevés mensuels (EX3 : saisie manuelle stricte, jamais de scraping). */
export const concurrentSchema = baseEntitySchema.extend({
  nom: z.string().min(1).max(150),
  instagram: z.string().max(60).nullable().optional(),
  segment: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type Concurrent = z.infer<typeof concurrentSchema>;
export const concurrentInsertSchema = concurrentSchema.omit({ id: true, created_at: true, updated_at: true });
export const concurrentUpdateSchema = concurrentInsertSchema.partial();

export const releveConcurrentSchema = z.object({
  id: z.string().uuid(),
  concurrent_id: z.string().uuid(),
  date: z.string(),
  followers: z.number().int().nonnegative(),
  posts_semaine: z.number().int().nonnegative(),
  observation: z.string().max(1000).nullable().optional(),
  lien: z.string().url().nullable().optional(),
});
export type ReleveConcurrent = z.infer<typeof releveConcurrentSchema>;
export const releveConcurrentInsertSchema = releveConcurrentSchema.omit({ id: true });

/** §4.7 — Expression du lexique (Culture Engine). RG-CU1/CU2. */
export const expressionSchema = baseEntitySchema.extend({
  texte: z.string().min(1).max(300),
  transliteration: z.string().max(300).nullable().optional(),
  registre_id: z.string().uuid(),
  statut: z.enum(STATUT_EXPRESSION).default("a_valider"),
  contexte_usage: z.string().max(500).nullable().optional(),
  exemple: z.string().max(500).nullable().optional(),
  ajoutee_par: z.string().uuid().nullable().optional(), // null si auto-proposée par un agent (RG-CU2)
  validee_par: z.string().uuid().nullable().optional(),
});
export type Expression = z.infer<typeof expressionSchema>;
export const expressionInsertSchema = expressionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  statut: true,
  validee_par: true,
});
export const expressionValidationSchema = z.object({ statut: z.enum(["validee", "interdite"]) });

/** §4.7 — Leçon. RG-LC3 : preuve requise sauf regle_maison. */
export const leconSchema = baseEntitySchema
  .extend({
    type: z.enum(TYPE_LECON),
    texte: z.string().min(1).max(280),
    preuve: z.string().nullable().optional(),
    campagne_id: z.string().uuid().nullable().optional(),
    statut: z.enum(STATUT_LECON).default("active"),
    injectee_agents: z.boolean().default(true),
    auteur_id: z.string().uuid(),
    fermetures_sans_reconfirmation: z.number().int().nonnegative().default(0), // RG-LC4
  })
  .refine((l) => l.type === "regle_maison" || !!l.preuve, {
    message: "La preuve (chiffre + source) est requise sauf pour une règle maison",
    path: ["preuve"],
  });
export type Lecon = z.infer<typeof leconSchema>;
export const leconInsertSchema = z.object({
  type: z.enum(TYPE_LECON),
  texte: z.string().min(1).max(280),
  preuve: z.string().nullable().optional(),
  campagne_id: z.string().uuid().nullable().optional(),
  injectee_agents: z.boolean().optional(),
  // auteur_id fixé par le serveur (utilisateur courant)
});
export const leconUpdateSchema = z.object({
  texte: z.string().min(1).max(280).optional(),
  statut: z.enum(STATUT_LECON).optional(),
  injectee_agents: z.boolean().optional(),
});
