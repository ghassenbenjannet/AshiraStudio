import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { ideeInsertSchema, ideeUpdateSchema } from "@achirah/shared";
import { db } from "../db/client.js";
import { idees } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import type { AppEnv } from "../types.js";

export const ideesRoutes = new Hono<AppEnv>();

/** §4.5 — Idées : liste antéchronologique, filtres statut/liaison. Le générateur scoré arrive en Phase ⑤. */
ideesRoutes.get("/", async (c) => {
  const { statut, article_coloris_id, tache_id, q } = c.req.query();
  let lignes = await db.select().from(idees).orderBy(desc(idees.created_at));
  if (statut) lignes = lignes.filter((x) => x.statut === statut);
  if (article_coloris_id) lignes = lignes.filter((x) => x.article_coloris_id === article_coloris_id);
  if (tache_id) lignes = lignes.filter((x) => x.tache_id === tache_id);
  if (q) lignes = lignes.filter((x) => x.contenu.toLowerCase().includes(q.toLowerCase()));
  return c.json({ donnees: lignes });
});

ideesRoutes.get("/:id", async (c) => {
  const [idee] = await db.select().from(idees).where(eq(idees.id, c.req.param("id"))).limit(1);
  if (!idee) return erreurApi(c, 404, "introuvable", "Idée introuvable");
  return c.json({ donnees: idee });
});

ideesRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", ideeInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(idees).values(c.req.valid("json")).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "idee.creer", entiteType: "idee", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

ideesRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", ideeUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(idees).where(eq(idees.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Idée introuvable");
  const [modifie] = (await db.update(idees).set(c.req.valid("json")).where(eq(idees.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "idee.modifier", entiteType: "idee", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

ideesRoutes.delete("/:id", exigerCapacite("entites.editer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(idees).where(eq(idees.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Idée introuvable");
  await db.delete(idees).where(eq(idees.id, id));
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "idee.supprimer", entiteType: "idee", entiteId: id, avant });
  return c.body(null, 204);
});
