import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";
import { utilisateurCreationSchema, utilisateurUpdateSchema, type RoleSysteme } from "@achirah/shared";
import { db } from "../db/client.js";
import { utilisateurs, membres } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { exigerAuth } from "../middleware/auth.js";
import { hashMotDePasse, genererIcalToken, versUtilisateurPublic } from "../lib/auth.js";
import type { AppEnv } from "../types.js";

export const utilisateursRoutes = new Hono<AppEnv>();

/**
 * CDC v4, Lot 3.2 — `utilisateurs` est une identité globale, sans RLS : « les utilisateurs de cette
 * organisation » n'est pas une propriété de la ligne `utilisateurs` elle-même mais de `membres`
 * (jointure explicite, ici, plutôt que par la RLS qui ne peut pas scoper une table qui n'a pas sa
 * propre colonne `organisation_id`).
 */
utilisateursRoutes.get("/", exigerCapacite("parametres.gerer"), async (c) => {
  const organisationId = c.get("utilisateur")!.organisation_id;
  const lignes = await db.select().from(utilisateurs).innerJoin(membres, and(eq(membres.utilisateur_id, utilisateurs.id), eq(membres.organisation_id, organisationId)));
  return c.json({ donnees: lignes.map((l) => versUtilisateurPublic(l.utilisateurs, l.membres.role_systeme as RoleSysteme, organisationId)) });
});

utilisateursRoutes.post("/", exigerCapacite("parametres.gerer"), zValidator("json", utilisateurCreationSchema), async (c) => {
  const admin = c.get("utilisateur")!;
  const corps = c.req.valid("json");
  const [existant] = await db.select({ id: utilisateurs.id }).from(utilisateurs).where(eq(utilisateurs.email, corps.email)).limit(1);
  if (existant) return erreurApi(c, 409, "email_utilise", "Cet email est déjà utilisé", "email");

  const [cree] = (await db
    .insert(utilisateurs)
    .values({
      email: corps.email,
      nom: corps.nom,
      password_hash: await hashMotDePasse(corps.mot_de_passe),
      langue: corps.langue ?? "fr",
      personne_id: corps.personne_id ?? null,
      ical_token: genererIcalToken(),
      vue_board_preferee: "liste",
    })
    .returning()) as any[];
  await db.insert(membres).values({ utilisateur_id: cree.id, organisation_id: admin.organisation_id, role_systeme: corps.role_systeme });

  await enregistrerAudit({ utilisateurId: admin.id, action: "utilisateur.creer", entiteType: "utilisateur", entiteId: cree.id, apres: { email: cree.email, role_systeme: corps.role_systeme } });
  return c.json({ donnees: versUtilisateurPublic(cree, corps.role_systeme, admin.organisation_id) }, 201);
});

utilisateursRoutes.patch("/:id", exigerCapacite("parametres.gerer"), zValidator("json", utilisateurUpdateSchema), async (c) => {
  const admin = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(utilisateurs).where(eq(utilisateurs.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Utilisateur introuvable");
  const [membreAvant] = await db.select().from(membres).where(and(eq(membres.utilisateur_id, id), eq(membres.organisation_id, admin.organisation_id))).limit(1);
  if (!membreAvant) return erreurApi(c, 404, "introuvable", "Utilisateur introuvable");

  const corps = c.req.valid("json");
  if (corps.role_systeme && corps.role_systeme !== "admin" && membreAvant.role_systeme === "admin") {
    const adminsOrganisation = await db.select({ id: membres.id }).from(membres).where(and(eq(membres.organisation_id, admin.organisation_id), eq(membres.role_systeme, "admin")));
    if (adminsOrganisation.length <= 1) {
      return erreurApi(c, 422, "dernier_admin", "Impossible de retirer le rôle admin du dernier administrateur (RG-R1)");
    }
  }

  const { role_systeme, ...patchUtilisateur } = corps;
  const [modifie] = (Object.keys(patchUtilisateur).length
    ? await db.update(utilisateurs).set(patchUtilisateur).where(eq(utilisateurs.id, id)).returning()
    : [avant]) as any[];
  const roleFinal = role_systeme
    ? (await db.update(membres).set({ role_systeme }).where(eq(membres.id, membreAvant.id)).returning())[0]!.role_systeme
    : membreAvant.role_systeme;

  await enregistrerAudit({ utilisateurId: admin.id, action: "utilisateur.modifier", entiteType: "utilisateur", entiteId: id, avant: { role_systeme: membreAvant.role_systeme }, apres: { role_systeme: roleFinal } });
  return c.json({ donnees: versUtilisateurPublic(modifie, roleFinal as RoleSysteme, admin.organisation_id) });
});

export const moiRoutes = new Hono<AppEnv>();
moiRoutes.use("*", exigerAuth);

// §8.2 — PATCH /utilisateurs/me/ical-token
moiRoutes.patch("/ical-token", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const token = genererIcalToken();
  const [modifie] = (await db.update(utilisateurs).set({ ical_token: token }).where(eq(utilisateurs.id, utilisateur.id)).returning()) as any[];
  return c.json({ donnees: versUtilisateurPublic(modifie, utilisateur.role_systeme, utilisateur.organisation_id) });
});

moiRoutes.patch("/", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const corps = (await c.req.json()) as { langue?: string; vue_board_preferee?: string };
  const patch: Record<string, unknown> = {};
  if (corps.langue === "fr" || corps.langue === "ar") patch.langue = corps.langue;
  if (corps.vue_board_preferee) patch.vue_board_preferee = corps.vue_board_preferee;
  const [modifie] = (await db.update(utilisateurs).set(patch).where(eq(utilisateurs.id, utilisateur.id)).returning()) as any[];
  return c.json({ donnees: versUtilisateurPublic(modifie, utilisateur.role_systeme, utilisateur.organisation_id) });
});
