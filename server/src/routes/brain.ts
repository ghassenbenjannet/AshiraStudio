import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { erreurApi } from "../lib/http.js";
import { ErreurIaIndisponible } from "../lib/anthropic.js";
import { briefQuotidien } from "../services/ia/generation.js";
import { poserQuestion } from "../services/ia/boucle.js";
import type { AppEnv } from "../types.js";

/** §6.5 — Le Brain : brief quotidien (mis en cache la journée) + Q&A libre depuis HOME. */
export const brainRoutes = new Hono<AppEnv>();

brainRoutes.post("/brief", async (c) => {
  const force = c.req.query("force") === "1";
  try {
    const brief = await briefQuotidien(force);
    return c.json({ donnees: brief });
  } catch (err) {
    if (err instanceof ErreurIaIndisponible) return erreurApi(c, 503, "ia_indisponible", err.message);
    throw err;
  }
});

const questionSchema = z.object({ question: z.string().min(1), campagne_id: z.string().uuid().nullable().optional() });
brainRoutes.post("/question", zValidator("json", questionSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const corps = c.req.valid("json");
  try {
    const resultat = await poserQuestion(corps.question, { utilisateurId: utilisateur.id, role: utilisateur.role_systeme }, corps.campagne_id);
    return c.json({ donnees: resultat });
  } catch (err) {
    if (err instanceof ErreurIaIndisponible) return erreurApi(c, 503, "ia_indisponible", err.message);
    throw err;
  }
});
