import { Hono } from "hono";
import { desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { audits } from "../db/schema.js";
import { exigerCapacite } from "../middleware/rbac.js";
import type { AppEnv } from "../types.js";

export const auditRoutes = new Hono<AppEnv>();

/** §4.9 — Journal d'audit, réservé parametres.gerer (couvre écritures manuelles ET agents, RG-AGW5). */
auditRoutes.get("/", exigerCapacite("parametres.gerer"), async (c) => {
  const { entite_type, utilisateur_id, action, depuis, jusqua, page = "1", taille = "50" } = c.req.query();
  let lignes = await db.select().from(audits).orderBy(desc(audits.at));
  if (entite_type) lignes = lignes.filter((a) => a.entite_type === entite_type);
  if (utilisateur_id) lignes = lignes.filter((a) => a.utilisateur_id === utilisateur_id);
  if (action) lignes = lignes.filter((a) => a.action.includes(action));
  if (depuis) lignes = lignes.filter((a) => a.at >= depuis);
  if (jusqua) lignes = lignes.filter((a) => a.at <= jusqua);

  const p = Math.max(1, Number(page) || 1);
  const t = Math.min(200, Math.max(1, Number(taille) || 50));
  const debut = (p - 1) * t;
  return c.json({ donnees: lignes.slice(debut, debut + t), total: lignes.length, page: p, taille: t });
});
