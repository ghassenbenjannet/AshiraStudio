import { createMiddleware } from "hono/factory";
import { logger } from "../lib/logger.js";

export const journaliserRequetes = createMiddleware(async (c, next) => {
  const debut = Date.now();
  await next();
  logger.info(
    { methode: c.req.method, chemin: c.req.path, statut: c.res.status, duree_ms: Date.now() - debut },
    "requete",
  );
});
