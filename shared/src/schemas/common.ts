import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");
export const montantDtSchema = z.number().nonnegative();
export const pourcentageSchema = z.number().min(0).max(100);

export const baseEntitySchema = z.object({
  id: uuidSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const archivableEntitySchema = baseEntitySchema.extend({
  archived_at: isoDateTimeSchema.nullable().optional(),
});

/** JSON-in-column générique — validé plus finement au niveau de chaque schéma quand la forme est connue. */
export const jsonRecordSchema = z.record(z.string(), z.unknown());

export const checklistItemSchema = z.object({
  id: z.string(),
  libelle: z.string(),
  coche: z.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

/**
 * CR-02 §C — forme partagée du bandeau « Prochaine étape » : `[état actuel] → [ce qui manque] →
 * [une action]`. Le serveur ne renvoie que des codes + paramètres numériques/textuels bruts (jamais
 * de texte traduit) — c'est le front qui compose `t(\`prochaine_etape.<objet>.<cle>\`, params)` pour
 * chaque segment, exactement comme `calculerPretATourner` renvoie des codes (`manques: string[]`)
 * traduits côté front. Composant purement informatif (RG-PAR1) : `actionCle` peut toujours être
 * ignoré, le chemin manuel (onglets/formulaires) reste intact.
 */
export interface ProchaineEtape {
  etatCle: string;
  etatParams?: Record<string, number | string>;
  manqueCle: string | null;
  manqueParams?: Record<string, number | string>;
  actionCle: string | null;
}
