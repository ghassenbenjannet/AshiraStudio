import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE, utilisateurDeSession } from "../lib/auth.js";
import { executerAvecOrganisation } from "../db/client.js";
import type { AppEnv } from "../types.js";

/** Résout la session (cookie httpOnly) et attache l'utilisateur au contexte. Ne bloque pas — voir `exigerAuth`. */
export const resoudreSession = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE) ?? null;
  c.set("sessionToken", token);
  c.set("utilisateur", token ? await utilisateurDeSession(token) : null);
  await next();
});

export const exigerAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("utilisateur")) {
    return c.json({ error: { code: "non_authentifie", message: "Authentification requise" } }, 401);
  }
  await next();
});

/**
 * CDC v4, Lot 3.3 — pose le contexte RLS (`SET LOCAL app.organisation_id`, `db/client.ts`) pour
 * toute la suite de la requête, dès qu'une session authentifiée porte une organisation. Placé APRÈS
 * `resoudreSession` (qui, lui, interroge des tables sans RLS — `sessions`/`utilisateurs`/`membres`
 * — donc n'a pas besoin de ce contexte) et avant les routes métier. Une requête sans session
 * authentifiée continue sur la connexion non scopée : elle ne touche de toute façon aucune table
 * métier avant `exigerAuth`.
 */
export const avecOrganisation = createMiddleware<AppEnv>(async (c, next) => {
  const utilisateur = c.get("utilisateur");
  if (!utilisateur) return next();
  await executerAvecOrganisation(utilisateur.organisation_id, next);
});
