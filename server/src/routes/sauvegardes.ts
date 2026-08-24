import { Hono } from "hono";
import { exigerCapacite } from "../middleware/rbac.js";
import { enregistrerAudit } from "../lib/audit.js";
import { creerSauvegarde, listerSauvegardes } from "../lib/sauvegardes.js";
import type { AppEnv } from "../types.js";

export const sauvegardesRoutes = new Hono<AppEnv>();

sauvegardesRoutes.use("*", exigerCapacite("parametres.gerer"));

sauvegardesRoutes.get("/", async (c) => {
  return c.json({ donnees: listerSauvegardes() });
});

sauvegardesRoutes.post("/", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const sauvegarde = await creerSauvegarde();
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "sauvegarde.creer", entiteType: "sauvegarde", entiteId: sauvegarde.nom, apres: { ...sauvegarde } });
  return c.json({ donnees: sauvegarde }, 201);
});
