import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db/client.js";
import { utilisateurs } from "../db/schema.js";
import { seed } from "../db/seed.js";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  creerSession,
  genererIcalToken,
  hashMotDePasse,
  versUtilisateurPublic,
} from "../lib/auth.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { env } from "../lib/env.js";
import { MOTS_DE_PASSE_LONGUEUR_MIN } from "@achirah/shared";

/**
 * E02 — Écran d'initialisation : au tout premier lancement, crée le premier compte admin
 * et applique le seed complet (référentiels + Annexes A-F). RG-R1 : toujours ≥ 1 admin.
 * Pas d'auto-inscription ensuite (§2.1) — cette route se referme d'elle-même une fois un
 * utilisateur créé.
 */
export const initRoutes = new Hono();

initRoutes.get("/statut", async (c) => {
  const [utilisateur] = await db.select({ id: utilisateurs.id }).from(utilisateurs).limit(1);
  return c.json({ initialise: !!utilisateur });
});

const initSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(1).max(120),
  mot_de_passe: z.string().min(MOTS_DE_PASSE_LONGUEUR_MIN),
});

initRoutes.post("/", zValidator("json", initSchema), async (c) => {
  const [dejaInitialise] = await db.select({ id: utilisateurs.id }).from(utilisateurs).limit(1);
  if (dejaInitialise) {
    return erreurApi(c, 409, "deja_initialise", "L'application a déjà été initialisée");
  }

  const { email, nom, mot_de_passe } = c.req.valid("json");
  await seed();

  const passwordHash = await hashMotDePasse(mot_de_passe);
  const icalToken = genererIcalToken();
  const [utilisateur] = await db
    .insert(utilisateurs)
    .values({
      email,
      nom,
      password_hash: passwordHash,
      role_systeme: "admin",
      langue: "fr",
      ical_token: icalToken,
      vue_board_preferee: "liste",
    })
    .returning();

  if (!utilisateur) {
    return erreurApi(c, 500, "erreur_creation", "Échec de la création du premier compte");
  }

  await enregistrerAudit({
    utilisateurId: utilisateur.id,
    action: "initialisation",
    entiteType: "utilisateur",
    entiteId: utilisateur.id,
    apres: { email, role_systeme: "admin" },
  });

  const token = await creerSession(utilisateur.id);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });

  return c.json({ utilisateur: versUtilisateurPublic(utilisateur) }, 201);
});
