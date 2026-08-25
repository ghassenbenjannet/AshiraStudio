import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, executerAvecOrganisation } from "../db/client.js";
import { utilisateurs, organisations, membres } from "../db/schema.js";
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

  // CDC v4, Lot 3.2 — la première organisation est créée ici, sans écran dédié : le parcours
  // self-service (nommer/choisir son organisation) est C2.1, hors périmètre du Lot 3. « Achirah »
  // reprend le nom de marque déjà partout dans le seed plutôt que d'inventer un champ non demandé.
  const [organisation] = await db.insert(organisations).values({ nom: "Achirah", slug: "achirah" }).returning();
  if (!organisation) {
    return erreurApi(c, 500, "erreur_creation", "Échec de la création de l'organisation");
  }

  const passwordHash = await hashMotDePasse(mot_de_passe);
  const icalToken = genererIcalToken();

  // Tout ce qui suit (compte, appartenance, seed, audit) s'exécute avec le contexte d'organisation
  // posé (Lot 3.3) : le seed peuple des tables sous RLS, et l'entrée d'audit elle-même en porte une.
  const utilisateur = await executerAvecOrganisation(organisation.id, async () => {
    const [u] = await db
      .insert(utilisateurs)
      .values({
        email,
        nom,
        password_hash: passwordHash,
        langue: "fr",
        ical_token: icalToken,
        vue_board_preferee: "liste",
      })
      .returning();
    if (!u) return null;

    await db.insert(membres).values({ utilisateur_id: u.id, organisation_id: organisation.id, role_systeme: "admin" });
    await seed();
    await enregistrerAudit({
      utilisateurId: u.id,
      action: "initialisation",
      entiteType: "utilisateur",
      entiteId: u.id,
      apres: { email, role_systeme: "admin", organisation_id: organisation.id },
    });
    return u;
  });

  if (!utilisateur) {
    return erreurApi(c, 500, "erreur_creation", "Échec de la création du premier compte");
  }

  const token = await creerSession(utilisateur.id, organisation.id);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });

  return c.json({ utilisateur: versUtilisateurPublic(utilisateur, "admin", organisation.id) }, 201);
});
