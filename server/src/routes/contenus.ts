import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { contenuInsertSchema, contenuUpdateSchema } from "@achirah/shared";
import { db } from "../db/client.js";
import { contenus, contenuVersions } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import {
  soumettreContenu,
  approuverContenu,
  planifierContenu,
  publierContenu,
  archiverContenu,
  dupliquerContenu,
  restaurerVersion,
  snapshotVersionSiNecessaire,
  ErreurMetier,
} from "../services/contenus.js";
import type { AppEnv } from "../types.js";

export const contenusRoutes = new Hono<AppEnv>();

function gererErreurMetier(c: any, err: unknown) {
  if (err instanceof ErreurMetier) return erreurApi(c, err.status, err.code, err.message);
  throw err;
}

contenusRoutes.get("/", async (c) => {
  const { statut, campagne_id } = c.req.query();
  let lignes = await db.select().from(contenus).orderBy(desc(contenus.created_at));
  if (statut) lignes = lignes.filter((x) => x.statut === statut);
  if (campagne_id) lignes = lignes.filter((x) => x.campagne_id === campagne_id);
  return c.json({ donnees: lignes });
});

contenusRoutes.get("/:id", async (c) => {
  const [contenu] = await db.select().from(contenus).where(eq(contenus.id, c.req.param("id"))).limit(1);
  if (!contenu) return erreurApi(c, 404, "introuvable", "Contenu introuvable");
  return c.json({ donnees: contenu });
});

contenusRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", contenuInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db
    .insert(contenus)
    .values({ ...c.req.valid("json"), auteur_id: utilisateur.id, statut: "brouillon" })
    .returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "contenu.creer", entiteType: "contenu", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

contenusRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", contenuUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(contenus).where(eq(contenus.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Contenu introuvable");

  const corps = c.req.valid("json");
  if (corps.caption !== undefined && corps.caption !== avant.caption) {
    await snapshotVersionSiNecessaire(id, utilisateur.id);
  }
  const [modifie] = (await db.update(contenus).set(corps).where(eq(contenus.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "contenu.modifier", entiteType: "contenu", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

contenusRoutes.post("/:id/soumettre", exigerCapacite("entites.editer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    return c.json({ donnees: await soumettreContenu(c.req.param("id"), utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

contenusRoutes.post("/:id/approuver", exigerCapacite("approbation.gerer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    return c.json({ donnees: await approuverContenu(c.req.param("id"), utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

const planifierSchema = z.object({ date_publication: z.string().datetime({ offset: true }) });
contenusRoutes.post("/:id/planifier", exigerCapacite("entites.editer"), zValidator("json", planifierSchema), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    return c.json({ donnees: await planifierContenu(c.req.param("id"), c.req.valid("json").date_publication, utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

contenusRoutes.post("/:id/publier", exigerCapacite("entites.editer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    return c.json({ donnees: await publierContenu(c.req.param("id"), utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

contenusRoutes.post("/:id/archiver", exigerCapacite("entites.editer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    return c.json({ donnees: await archiverContenu(c.req.param("id"), utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

const dupliquerSchema = z.object({ plateformes: z.array(z.string().uuid()).optional() });
contenusRoutes.post("/:id/dupliquer", exigerCapacite("entites.editer"), zValidator("json", dupliquerSchema), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const copie = await dupliquerContenu(c.req.param("id"), utilisateur.id, c.req.valid("json").plateformes);
    return c.json({ donnees: copie }, 201);
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

contenusRoutes.get("/:id/versions", async (c) => {
  const lignes = await db.select().from(contenuVersions).where(eq(contenuVersions.contenu_id, c.req.param("id"))).orderBy(desc(contenuVersions.at));
  return c.json({ donnees: lignes });
});

contenusRoutes.post("/:id/versions/:versionId/restaurer", exigerCapacite("entites.editer"), async (c) => {
  try {
    const utilisateur = c.get("utilisateur")!;
    const { id, versionId } = c.req.param();
    return c.json({ donnees: await restaurerVersion(id, versionId, utilisateur.id) });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});
