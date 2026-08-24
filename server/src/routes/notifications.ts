import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TYPE_NOTIFICATION } from "@achirah/shared";
import { db } from "../db/client.js";
import { notifications, reglagesNotification } from "../db/schema.js";
import type { AppEnv } from "../types.js";

export const notificationsRoutes = new Hono<AppEnv>();

notificationsRoutes.get("/", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const { non_lues } = c.req.query();
  let lignes = await db.select().from(notifications).where(eq(notifications.utilisateur_id, utilisateur.id)).orderBy(desc(notifications.created_at));
  if (non_lues === "true") lignes = lignes.filter((n) => !n.lu);
  return c.json({ donnees: lignes.slice(0, 50) });
});

notificationsRoutes.post("/:id/lu", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [modifiee] = (await db
    .update(notifications)
    .set({ lu: true })
    .where(and(eq(notifications.id, c.req.param("id")), eq(notifications.utilisateur_id, utilisateur.id)))
    .returning()) as (typeof notifications.$inferSelect)[];
  return c.json({ donnees: modifiee ?? null });
});

notificationsRoutes.post("/lu-tout", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  await db.update(notifications).set({ lu: true }).where(eq(notifications.utilisateur_id, utilisateur.id));
  return c.json({ donnees: { ok: true } });
});

notificationsRoutes.get("/reglages", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const lignes = await db.select().from(reglagesNotification).where(eq(reglagesNotification.utilisateur_id, utilisateur.id));
  const parType = new Map(lignes.map((l) => [l.type, l.canaux]));
  return c.json({
    donnees: TYPE_NOTIFICATION.map((type) => ({ type, canaux: parType.get(type) ?? ["in_app"] })),
  });
});

const reglageUpdateSchema = z.object({ canaux: z.array(z.enum(["in_app", "email", "push"])) });
notificationsRoutes.put("/reglages/:type", zValidator("json", reglageUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const type = c.req.param("type");
  if (!(TYPE_NOTIFICATION as readonly string[]).includes(type)) {
    return c.json({ error: { code: "type_invalide", message: "Type de notification inconnu" } }, 400);
  }
  const { canaux } = c.req.valid("json");
  await db
    .insert(reglagesNotification)
    .values({ utilisateur_id: utilisateur.id, type, canaux })
    .onConflictDoUpdate({ target: [reglagesNotification.utilisateur_id, reglagesNotification.type], set: { canaux } });
  return c.json({ donnees: { type, canaux } });
});
