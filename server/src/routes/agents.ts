import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { agentCampagneInsertSchema, agentCampagneUpdateSchema } from "@achirah/shared";
import { db } from "../db/client.js";
import { agentsCampagne } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { ErreurIaIndisponible } from "../lib/anthropic.js";
import { testerAgent } from "../services/ia/boucle.js";
import type { AppEnv } from "../types.js";

export const agentsRoutes = new Hono<AppEnv>();

agentsRoutes.get("/", async (c) => {
  const campagneId = c.req.query("campagne_id");
  let lignes = await db.select().from(agentsCampagne);
  if (campagneId) lignes = lignes.filter((a) => a.campagne_id === campagneId || a.campagne_id === null);
  return c.json({ donnees: lignes });
});

agentsRoutes.get("/:id", async (c) => {
  const [agent] = await db.select().from(agentsCampagne).where(eq(agentsCampagne.id, c.req.param("id"))).limit(1);
  if (!agent) return erreurApi(c, 404, "introuvable", "Agent introuvable");
  return c.json({ donnees: agent });
});

agentsRoutes.post("/", exigerCapacite("approbation.gerer"), zValidator("json", agentCampagneInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(agentsCampagne).values({ ...c.req.valid("json"), cree_par: utilisateur.id }).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "agent.creer", entiteType: "agent_campagne", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

agentsRoutes.patch("/:id", exigerCapacite("approbation.gerer"), zValidator("json", agentCampagneUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(agentsCampagne).where(eq(agentsCampagne.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Agent introuvable");
  const [modifie] = (await db.update(agentsCampagne).set(c.req.valid("json")).where(eq(agentsCampagne.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "agent.modifier", entiteType: "agent_campagne", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

const testerSchema = z.object({ message: z.string().min(1) });
agentsRoutes.post("/:id/tester", exigerCapacite("approbation.gerer"), zValidator("json", testerSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  try {
    const resultat = await testerAgent(c.req.param("id"), c.req.valid("json").message, { utilisateurId: utilisateur.id, role: utilisateur.role_systeme });
    return c.json({ donnees: resultat });
  } catch (err) {
    if (err instanceof ErreurIaIndisponible) return erreurApi(c, 503, "ia_indisponible", err.message);
    throw err;
  }
});
