import { z } from "zod";
import { PLATEFORME_INTEGRATION, STATUT_INTEGRATION } from "../constants/enums.js";

/** §4.8 — Snapshot de métriques, quelle que soit la source (manuelle ou API). */
export const metriqueSnapshotSchema = z.object({
  id: z.string().uuid(),
  plateforme: z.string().min(1), // plateforme_contenu_id ou clé de plateforme d'intégration
  date: z.string(),
  kpis: z.record(z.string(), z.number()),
  source: z.enum(["manuel", "api"]).default("manuel"),
  campagne_id: z.string().uuid().nullable().optional(),
});
export type MetriqueSnapshot = z.infer<typeof metriqueSnapshotSchema>;
export const metriqueSnapshotInsertSchema = metriqueSnapshotSchema.omit({ id: true });

/** §4.8 — Intégration externe. RG-I1 : lecture seule. RG-I2 : déconnexion ne supprime jamais l'historique. */
export const integrationSchema = z.object({
  id: z.string().uuid(),
  plateforme: z.enum(PLATEFORME_INTEGRATION),
  statut: z.enum(STATUT_INTEGRATION).default("deconnectee"),
  dernier_sync: z.string().datetime({ offset: true }).nullable().optional(),
  frequence: z.literal("quotidienne").default("quotidienne"),
  derniere_erreur: z.string().nullable().optional(),
});
export type Integration = z.infer<typeof integrationSchema>;
/** Les credentials chiffrés ne transitent jamais côté client — jamais dans ce schéma public. */

export const formulaireManuelHebdoSchema = z.object({
  plateforme: z.string().min(1),
  semaine: z.string(), // ISO week ou date de début de semaine
  kpis: z.record(z.string(), z.number()),
});
