import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { boardInsertSchema, boardUpdateSchema, TYPE_BOARD_ITEM, OBJECTIF_CAMPAGNE } from "@achirah/shared";
import { db } from "../db/client.js";
import { boards } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { ajouterItem, modifierItem, supprimerItem, transformerEnCampagne, ErreurMetier } from "../services/boards.js";
import type { AppEnv } from "../types.js";

export const boardsRoutes = new Hono<AppEnv>();

function gererErreurMetier(c: any, err: unknown) {
  if (err instanceof ErreurMetier) return erreurApi(c, err.status, err.code, err.message);
  throw err;
}

boardsRoutes.get("/", async (c) => {
  const campagneId = c.req.query("campagne_id");
  let lignes = await db.select().from(boards).orderBy(desc(boards.created_at));
  if (campagneId) lignes = lignes.filter((b) => b.campagne_id === campagneId);
  return c.json({ donnees: lignes });
});

boardsRoutes.get("/:id", async (c) => {
  const [board] = await db.select().from(boards).where(eq(boards.id, c.req.param("id"))).limit(1);
  if (!board) return erreurApi(c, 404, "introuvable", "Board introuvable");
  return c.json({ donnees: board });
});

boardsRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", boardInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(boards).values(c.req.valid("json")).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "board.creer", entiteType: "board", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

boardsRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", boardUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Board introuvable");
  const [modifie] = (await db.update(boards).set(c.req.valid("json")).where(eq(boards.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "board.modifier", entiteType: "board", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

boardsRoutes.delete("/:id", exigerCapacite("entites.editer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Board introuvable");
  await db.delete(boards).where(eq(boards.id, id));
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "board.supprimer", entiteType: "board", entiteId: id, avant });
  return c.body(null, 204);
});

const itemSchema = z.object({
  type: z.enum(TYPE_BOARD_ITEM),
  contenu: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  couleur: z.string().nullable().optional(),
});
boardsRoutes.post("/:id/items", exigerCapacite("entites.editer"), zValidator("json", itemSchema), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    return c.json({ donnees: await ajouterItem(c.req.param("id"), c.req.valid("json"), utilisateur.id) }, 201);
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

const itemPatchSchema = itemSchema.partial();
boardsRoutes.patch("/:id/items/:itemId", exigerCapacite("entites.editer"), zValidator("json", itemPatchSchema), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const { id, itemId } = c.req.param();
    return c.json({ donnees: await modifierItem(id, itemId, c.req.valid("json"), utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

boardsRoutes.delete("/:id/items/:itemId", exigerCapacite("entites.editer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const { id, itemId } = c.req.param();
    return c.json({ donnees: await supprimerItem(id, itemId, utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

const transformerSchema = z.object({
  item_ids: z.array(z.string()).min(1),
  nom: z.string().min(1).max(150),
  type_campagne_id: z.string().uuid(),
  date_debut: z.string(),
  date_fin: z.string(),
  objectif: z.enum(OBJECTIF_CAMPAGNE),
});
boardsRoutes.post("/:id/transformer-en-campagne", exigerCapacite("entites.editer"), zValidator("json", transformerSchema), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const campagne = await transformerEnCampagne(c.req.param("id"), c.req.valid("json"), utilisateur.id);
    return c.json({ donnees: campagne }, 201);
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});
