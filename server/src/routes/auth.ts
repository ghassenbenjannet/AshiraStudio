import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { loginSchema } from "@achirah/shared";
import { db } from "../db/client.js";
import { utilisateurs } from "../db/schema.js";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  creerSession,
  detruireSession,
  enregistrerEchecLogin,
  estVerrouille,
  reinitialiserEchecsLogin,
  verifierMotDePasse,
  versUtilisateurPublic,
} from "../lib/auth.js";
import { erreurApi } from "../lib/http.js";
import { resoudreSession, exigerAuth } from "../middleware/auth.js";
import { env } from "../lib/env.js";
import type { AppEnv } from "../types.js";

export const authRoutes = new Hono<AppEnv>();
authRoutes.use("*", resoudreSession);

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, mot_de_passe } = c.req.valid("json");
  const [utilisateur] = await db.select().from(utilisateurs).where(eq(utilisateurs.email, email)).limit(1);

  if (!utilisateur) {
    return erreurApi(c, 401, "identifiants_invalides", "Email ou mot de passe incorrect");
  }
  if (estVerrouille(utilisateur.verrouille_jusqua)) {
    return erreurApi(c, 401, "compte_verrouille", "Compte verrouillé temporairement après plusieurs échecs — réessayez dans quelques minutes");
  }
  const motDePasseValide = await verifierMotDePasse(mot_de_passe, utilisateur.password_hash);
  if (!motDePasseValide) {
    await enregistrerEchecLogin(utilisateur.id, utilisateur.echecs_login);
    return erreurApi(c, 401, "identifiants_invalides", "Email ou mot de passe incorrect");
  }

  await reinitialiserEchecsLogin(utilisateur.id);
  const token = await creerSession(utilisateur.id);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return c.json({ utilisateur: versUtilisateurPublic(utilisateur) });
});

authRoutes.post("/logout", async (c) => {
  const token = c.get("sessionToken");
  if (token) await detruireSession(token);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.body(null, 204);
});

authRoutes.get("/me", exigerAuth, async (c) => {
  return c.json({ utilisateur: c.get("utilisateur") });
});
