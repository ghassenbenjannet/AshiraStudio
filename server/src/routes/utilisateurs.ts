import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { utilisateurCreationSchema, utilisateurUpdateSchema } from "@achirah/shared";
import { db } from "../db/client.js";
import { utilisateurs } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { exigerAuth } from "../middleware/auth.js";
import { hashMotDePasse, genererIcalToken, versUtilisateurPublic } from "../lib/auth.js";
import type { AppEnv } from "../types.js";

export const utilisateursRoutes = new Hono<AppEnv>();

utilisateursRoutes.get("/", exigerCapacite("parametres.gerer"), async (c) => {
  const lignes = await db.select().from(utilisateurs);
  return c.json({ donnees: lignes.map(versUtilisateurPublic) });
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
      role_systeme: corps.role_systeme,
      langue: corps.langue ?? "fr",
      personne_id: corps.personne_id ?? null,
      ical_token: genererIcalToken(),
      vue_board_preferee: "liste",
    })
    .returning()) as any[];

  await enregistrerAudit({ utilisateurId: admin.id, action: "utilisateur.creer", entiteType: "utilisateur", entiteId: cree.id, apres: { email: cree.email, role_systeme: cree.role_systeme } });
  return c.json({ donnees: versUtilisateurPublic(cree) }, 201);
});

utilisateursRoutes.patch("/:id", exigerCapacite("parametres.gerer"), zValidator("json", utilisateurUpdateSchema), async (c) => {
  const admin = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(utilisateurs).where(eq(utilisateurs.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Utilisateur introuvable");

  const corps = c.req.valid("json");
  if (corps.role_systeme && corps.role_systeme !== "admin" && avant.role_systeme === "admin") {
    const admins = await db.select({ id: utilisateurs.id }).from(utilisateurs).where(eq(utilisateurs.role_systeme, "admin"));
    if (admins.length <= 1) {
      return erreurApi(c, 422, "dernier_admin", "Impossible de retirer le rôle admin du dernier administrateur (RG-R1)");
    }
  }

  const [modifie] = (await db.update(utilisateurs).set(corps).where(eq(utilisateurs.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: admin.id, action: "utilisateur.modifier", entiteType: "utilisateur", entiteId: id, avant: { role_systeme: avant.role_systeme }, apres: { role_systeme: modifie.role_systeme } });
  return c.json({ donnees: versUtilisateurPublic(modifie) });
});

export const moiRoutes = new Hono<AppEnv>();
moiRoutes.use("*", exigerAuth);

// §8.2 — PATCH /utilisateurs/me/ical-token
moiRoutes.patch("/ical-token", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const token = genererIcalToken();
  const [modifie] = (await db.update(utilisateurs).set({ ical_token: token }).where(eq(utilisateurs.id, utilisateur.id)).returning()) as any[];
  return c.json({ donnees: versUtilisateurPublic(modifie) });
});

moiRoutes.patch("/", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const corps = (await c.req.json()) as { langue?: string; vue_board_preferee?: string };
  const patch: Record<string, unknown> = {};
  if (corps.langue === "fr" || corps.langue === "ar") patch.langue = corps.langue;
  if (corps.vue_board_preferee) patch.vue_board_preferee = corps.vue_board_preferee;
  const [modifie] = (await db.update(utilisateurs).set(patch).where(eq(utilisateurs.id, utilisateur.id)).returning()) as any[];
  return c.json({ donnees: versUtilisateurPublic(modifie) });
});
