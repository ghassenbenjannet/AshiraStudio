import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { ZodTypeAny } from "zod";
import { z } from "zod";
import { db } from "../db/client.js";
import { erreurApi } from "./http.js";
import { enregistrerAudit } from "./audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import type { AppEnv } from "../types.js";

/**
 * Fabrique de routes CRUD pour les référentiels archivables de la Partie V.
 * RG-PARAM1 : listes de valeurs paramétrables, CRUD éditeur+ (approbation.gerer), réordonnables,
 * jamais supprimées si référencées — DELETE archive plutôt que de détruire (§5, RG-G1).
 * Utilisée à la fois par les routes HTTP et, potentiellement, par de futurs outils agent en
 * lecture (RG-PAR1a) : la logique de filtrage/tri vit ici, une seule fois.
 */
export function creerRoutesReferentiel(options: {
  table: any;
  entiteType: string;
  insertSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  /** Valeurs fixes imposées à chaque ligne (ex. categorie='canal' pour une sous-liste de listes_parametrables). */
  valeursFixes?: Record<string, unknown>;
  /** Tri secondaire optionnel si la table n'a pas de colonne `ordre` exploitable directement. */
  colonneTri?: any;
  /** Validation métier avant modification (ex. RG §5.0 : code_prefixe immuable dès le 1er article). Retourne un message d'erreur ou null. */
  validerAvantModification?: (id: string, corps: Record<string, unknown>) => Promise<string | null>;
}) {
  const { table, entiteType, insertSchema, updateSchema, valeursFixes = {}, colonneTri, validerAvantModification } = options;
  const app = new Hono<AppEnv>();
  const triCol = colonneTri ?? table.ordre ?? table.nom;

  const filtreFixe = () =>
    Object.entries(valeursFixes).map(([col, val]) => eq(table[col], val));

  app.get("/", async (c) => {
    const inclureArchives = c.req.query("archives") === "1";
    const conditions = [...filtreFixe()];
    if (!inclureArchives && table.archived_at) conditions.push(isNull(table.archived_at));
    const lignes = await db
      .select()
      .from(table)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(triCol));
    return c.json({ donnees: lignes });
  });

  app.get("/:id", async (c) => {
    const [ligne] = await db.select().from(table).where(eq(table.id, c.req.param("id"))).limit(1);
    if (!ligne) return erreurApi(c, 404, "introuvable", "Référentiel introuvable");
    return c.json({ donnees: ligne });
  });

  app.post("/", exigerCapacite("approbation.gerer"), zValidator("json", insertSchema), async (c) => {
    const utilisateur = c.get("utilisateur")!;
    const corps = { ...c.req.valid("json"), ...valeursFixes };
    const [cree] = (await db.insert(table).values(corps).returning()) as any[];
    await enregistrerAudit({
      utilisateurId: utilisateur.id,
      action: `${entiteType}.creer`,
      entiteType,
      entiteId: cree.id,
      apres: cree,
    });
    return c.json({ donnees: cree }, 201);
  });

  app.patch("/:id", exigerCapacite("approbation.gerer"), zValidator("json", updateSchema), async (c) => {
    const utilisateur = c.get("utilisateur")!;
    const id = c.req.param("id");
    const [avant] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!avant) return erreurApi(c, 404, "introuvable", "Référentiel introuvable");
    if (validerAvantModification) {
      const erreur = await validerAvantModification(id, c.req.valid("json") as Record<string, unknown>);
      if (erreur) return erreurApi(c, 422, "modification_interdite", erreur);
    }
    const [modifie] = (await db.update(table).set(c.req.valid("json")).where(eq(table.id, id)).returning()) as any[];
    await enregistrerAudit({
      utilisateurId: utilisateur.id,
      action: `${entiteType}.modifier`,
      entiteType,
      entiteId: id,
      avant,
      apres: modifie,
    });
    return c.json({ donnees: modifie });
  });

  app.post("/:id/reactiver", exigerCapacite("approbation.gerer"), async (c) => {
    const utilisateur = c.get("utilisateur")!;
    const id = c.req.param("id");
    if (!table.archived_at) {
      return erreurApi(c, 422, "non_archivable", "Cette liste ne supporte pas l'archivage");
    }
    const [avant] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!avant) return erreurApi(c, 404, "introuvable", "Référentiel introuvable");
    const [reactive] = (await db
      .update(table)
      .set({ archived_at: null })
      .where(eq(table.id, id))
      .returning()) as any[];
    await enregistrerAudit({
      utilisateurId: utilisateur.id,
      action: `${entiteType}.reactiver`,
      entiteType,
      entiteId: id,
      avant,
      apres: reactive,
    });
    return c.json({ donnees: reactive });
  });

  // DELETE = archivage (jamais de suppression physique — RG-G1 §5). Réactivation via action dédiée.
  app.delete("/:id", exigerCapacite("approbation.gerer"), async (c) => {
    const utilisateur = c.get("utilisateur")!;
    const id = c.req.param("id");
    if (!table.archived_at) {
      return erreurApi(c, 422, "non_archivable", "Cette liste ne supporte pas l'archivage");
    }
    const [avant] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!avant) return erreurApi(c, 404, "introuvable", "Référentiel introuvable");
    const [archive] = (await db
      .update(table)
      .set({ archived_at: new Date().toISOString() })
      .where(eq(table.id, id))
      .returning()) as any[];
    await enregistrerAudit({
      utilisateurId: utilisateur.id,
      action: `${entiteType}.archiver`,
      entiteType,
      entiteId: id,
      avant,
      apres: archive,
    });
    return c.json({ donnees: archive });
  });

  return app;
}

export const reorderSchema = z.object({ ordre: z.number().int().nonnegative() });
