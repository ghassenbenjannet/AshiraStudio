import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE, utilisateurDeSession } from "../lib/auth.js";
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
