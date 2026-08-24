import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { authRoutes } from "./routes/auth.js";
import { initRoutes } from "./routes/init.js";
import { resoudreSession } from "./middleware/auth.js";
import { journaliserRequetes } from "./middleware/logging.js";
import { limiteurDebit } from "./middleware/rate-limit.js";
import { erreurApi } from "./lib/http.js";
import type { AppEnv } from "./types.js";

export function creerApp() {
  const app = new Hono<AppEnv>();

  app.use("*", journaliserRequetes);
  app.use("*", csrf());
  app.use("/api/*", limiteurDebit());
  app.use("/api/*", resoudreSession);

  app.get("/health", (c) => c.json({ ok: true, at: new Date().toISOString() }));

  app.route("/api/init", initRoutes);
  app.route("/api/auth", authRoutes);

  app.notFound((c) => erreurApi(c, 404, "introuvable", "Ressource introuvable"));
  app.onError((err, c) => {
    if (err instanceof HTTPException && err.status === 403) {
      return erreurApi(c, 403, "origine_refusee", "Origine de la requête refusée (protection CSRF)");
    }
    console.error(err);
    return erreurApi(c, 500, "erreur_serveur", "Une erreur inattendue est survenue");
  });

  return app;
}
