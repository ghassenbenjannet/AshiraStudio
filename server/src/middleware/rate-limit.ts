import { createMiddleware } from "hono/factory";
import { erreurApi } from "../lib/http.js";

/** 300 req/15 min/IP (§8.2). En mémoire — un seul processus déployé (§8.1). */
export function limiteurDebit(maxRequetes = 300, fenetreMs = 15 * 60 * 1000) {
  const compteurs = new Map<string, { count: number; resetAt: number }>();

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "local";
    const maintenant = Date.now();
    const entree = compteurs.get(ip);
    if (!entree || entree.resetAt < maintenant) {
      compteurs.set(ip, { count: 1, resetAt: maintenant + fenetreMs });
    } else {
      entree.count += 1;
      if (entree.count > maxRequetes) {
        return erreurApi(c, 429, "trop_de_requetes", "Limite de requêtes atteinte, réessayez plus tard");
      }
    }
    await next();
  });
}
