import { Hono } from "hono";
import { inArray, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { assets } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import type { AppEnv } from "../types.js";

/**
 * Lecture minimale des assets — la galerie complète (upload, tags, liens croisés) est construite
 * en Phase ④. Nécessaire dès maintenant pour résoudre les asset_ids en URLs (ex. photos coloris).
 */
export const assetsRoutes = new Hono<AppEnv>();

assetsRoutes.get("/", async (c) => {
  const ids = c.req.query("ids")?.split(",").filter(Boolean);
  if (!ids || ids.length === 0) return c.json({ donnees: [] });
  const lignes = await db.select().from(assets).where(inArray(assets.id, ids));
  return c.json({ donnees: lignes });
});

assetsRoutes.get("/:id", async (c) => {
  const [asset] = await db.select().from(assets).where(eq(assets.id, c.req.param("id"))).limit(1);
  if (!asset) return erreurApi(c, 404, "introuvable", "Asset introuvable");
  return c.json({ donnees: asset });
});
