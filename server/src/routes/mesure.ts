import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { PLATEFORME_INTEGRATION } from "@achirah/shared";
import { db } from "../db/client.js";
import { metriqueSnapshots, integrations } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { connecterIntegration, syncIntegration, deconnecterIntegration, ErreurMetier } from "../services/mesure/integrations.js";
import type { AppEnv } from "../types.js";

export const mesureRoutes = new Hono<AppEnv>();

function gererErreurMetier(c: any, err: unknown) {
  if (err instanceof ErreurMetier) return erreurApi(c, err.status, err.code, err.message);
  throw err;
}

// ───────────────────────── Snapshots (saisie manuelle ou API) ─────────────────────────

mesureRoutes.get("/snapshots", async (c) => {
  const { plateforme, campagne_id } = c.req.query();
  let lignes = await db.select().from(metriqueSnapshots).orderBy(desc(metriqueSnapshots.date));
  if (plateforme) lignes = lignes.filter((s) => s.plateforme === plateforme);
  if (campagne_id) lignes = lignes.filter((s) => s.campagne_id === campagne_id);
  return c.json({ donnees: lignes });
});

const snapshotManuelSchema = z.object({
  plateforme: z.string().min(1),
  date: z.string(),
  kpis: z.record(z.string(), z.number()),
  campagne_id: z.string().uuid().nullable().optional(),
});
mesureRoutes.post("/snapshots", exigerCapacite("entites.editer"), zValidator("json", snapshotManuelSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(metriqueSnapshots).values({ ...c.req.valid("json"), source: "manuel" }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "mesure_snapshot.creer", entiteType: "metrique_snapshot", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

// ───────────────────────── Intégrations ─────────────────────────

mesureRoutes.get("/integrations", async (c) => {
  const lignes = await db.select().from(integrations);
  return c.json({ donnees: lignes.map(({ credentials_chiffres, ...reste }) => reste) });
});

const connexionSchema = z.object({ plateforme: z.enum(PLATEFORME_INTEGRATION), credentials: z.record(z.string(), z.string()) });
mesureRoutes.post("/integrations", exigerCapacite("parametres.gerer"), zValidator("json", connexionSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const { plateforme, credentials } = c.req.valid("json");
  try {
    const { credentials_chiffres, ...ligne } = await connecterIntegration(plateforme, credentials, utilisateur.id);
    return c.json({ donnees: ligne }, 201);
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

mesureRoutes.post("/integrations/:id/sync", exigerCapacite("parametres.gerer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  try {
    const { credentials_chiffres, ...ligne } = await syncIntegration(c.req.param("id"), utilisateur.id);
    return c.json({ donnees: ligne });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

mesureRoutes.post("/integrations/:id/deconnecter", exigerCapacite("parametres.gerer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  try {
    const { credentials_chiffres, ...ligne } = await deconnecterIntegration(c.req.param("id"), utilisateur.id);
    return c.json({ donnees: ligne });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});
