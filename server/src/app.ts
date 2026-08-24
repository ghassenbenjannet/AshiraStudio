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
import { contenusRoutes } from "./routes/contenus.js";
import { boardsRoutes } from "./routes/boards.js";
import { ideesRoutes } from "./routes/idees.js";
import { conversationsRoutes } from "./routes/conversations.js";
import { agentsRoutes } from "./routes/agents.js";
import { brainRoutes } from "./routes/brain.js";
import { mesureRoutes } from "./routes/mesure.js";
import { growRoutes } from "./routes/grow.js";
import { commentairesRoutes } from "./routes/commentaires.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { auditRoutes } from "./routes/audit.js";
import { exportsRoutes } from "./routes/exports.js";
import { sauvegardesRoutes } from "./routes/sauvegardes.js";
import { observabiliteRoutes } from "./routes/observabilite.js";
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
  app.use("/api/contenus/*", exigerAuth);
  app.route("/api/contenus", contenusRoutes);
  app.use("/api/boards/*", exigerAuth);
  app.route("/api/boards", boardsRoutes);
  app.use("/api/idees/*", exigerAuth);
  app.route("/api/idees", ideesRoutes);
  app.use("/api/conversations/*", exigerAuth);
  app.route("/api/conversations", conversationsRoutes);
  app.use("/api/agents/*", exigerAuth);
  app.route("/api/agents", agentsRoutes);
  app.use("/api/brain/*", exigerAuth);
  app.route("/api/brain", brainRoutes);
  app.use("/api/mesure/*", exigerAuth);
  app.route("/api/mesure", mesureRoutes);
  app.use("/api/recommandations/*", exigerAuth);
  app.use("/api/tendances/*", exigerAuth);
  app.use("/api/concurrents/*", exigerAuth);
  app.use("/api/expressions/*", exigerAuth);
  app.use("/api/lecons/*", exigerAuth);
  app.route("/api", growRoutes);
  app.use("/api/commentaires/*", exigerAuth);
  app.route("/api/commentaires", commentairesRoutes);
  app.use("/api/notifications/*", exigerAuth);
  app.route("/api/notifications", notificationsRoutes);
  app.use("/api/audit/*", exigerAuth);
  app.route("/api/audit", auditRoutes);
  app.use("/api/exports/*", exigerAuth);
  app.route("/api/exports", exportsRoutes);
  app.use("/api/sauvegardes/*", exigerAuth);
  app.route("/api/sauvegardes", sauvegardesRoutes);
  app.use("/api/observabilite/*", exigerAuth);
  app.route("/api/observabilite", observabiliteRoutes);

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
