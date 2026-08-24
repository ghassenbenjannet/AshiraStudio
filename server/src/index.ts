import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { creerApp } from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { demarrerPlanificateurRappels } from "./lib/scheduler.js";
import { demarrerSauvegardeAutomatique } from "./lib/sauvegardes.js";

const app = creerApp();

app.use(
  "/uploads/*",
  serveStatic({ root: env.uploadsDir, rewriteRequestPath: (path) => path.replace(/^\/uploads/, "") }),
);

/** Un seul processus déployé : le serveur sert aussi le front statique (§8.1). */
const frontDist = "../front/dist";
if (existsSync(frontDist)) {
  app.use("/*", serveStatic({ root: frontDist }));
  app.get("*", serveStatic({ path: `${frontDist}/index.html` }));
}

serve({ fetch: app.fetch, port: env.port }, (info) => {
  logger.info(`Achirah HQ — serveur démarré sur http://localhost:${info.port}`);
  demarrerPlanificateurRappels();
  demarrerSauvegardeAutomatique();
});
