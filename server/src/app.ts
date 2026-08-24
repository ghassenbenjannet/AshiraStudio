import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { authRoutes } from "./routes/auth.js";
import { initRoutes } from "./routes/init.js";
import { referentielsRoutes } from "./routes/referentiels.js";
import { contactsRoutes, partagePersonneRoutes } from "./routes/contacts.js";
import { catalogueRoutes } from "./routes/catalogue.js";
import { utilisateursRoutes, moiRoutes } from "./routes/utilisateurs.js";
import { assetsRoutes } from "./routes/assets.js";
import { campagnesRoutes } from "./routes/campagnes.js";
import { tachesRoutes, shootingsRoutes, looksRoutes, lookItemsRoutes, posesRoutes } from "./routes/taches.js";
import { icalRoutes } from "./routes/ical.js";
import { resoudreSession, exigerAuth } from "./middleware/auth.js";
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
  app.use("/api/referentiels/*", exigerAuth);
  app.route("/api/referentiels", referentielsRoutes);
  app.route("/api/partage", partagePersonneRoutes);
  app.use("/api/personnes/*", exigerAuth);
  app.use("/api/categories-contact/*", exigerAuth);
  app.use("/api/ambassadeurs/*", exigerAuth);
  app.route("/api", contactsRoutes);
  app.use("/api/articles/*", exigerAuth);
  app.use("/api/coloris/*", exigerAuth);
  app.use("/api/skus/*", exigerAuth);
  app.route("/api", catalogueRoutes);
  app.use("/api/utilisateurs/*", exigerAuth);
  app.route("/api/utilisateurs/me", moiRoutes);
  app.route("/api/utilisateurs", utilisateursRoutes);
  app.use("/api/assets/*", exigerAuth);
  app.route("/api/assets", assetsRoutes);
  app.use("/api/campagnes/*", exigerAuth);
  app.route("/api/campagnes", campagnesRoutes);
  app.use("/api/taches/*", exigerAuth);
  app.route("/api/taches", tachesRoutes);
  app.use("/api/shootings/*", exigerAuth);
  app.route("/api/shootings", shootingsRoutes);
  app.use("/api/looks/*", exigerAuth);
  app.route("/api/looks", looksRoutes);
  app.use("/api/look-items/*", exigerAuth);
  app.route("/api/look-items", lookItemsRoutes);
  app.use("/api/poses/*", exigerAuth);
  app.route("/api/poses", posesRoutes);
  // §4.6 : le token est l'auth — jamais de session requise sur ce flux.
  app.route("/api/ical", icalRoutes);

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
