import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import {
  personneInsertSchema,
  personneUpdateSchema,
  categorieContactInsertSchema,
  ambassadeurInsertSchema,
  ambassadeurUpdateSchema,
} from "@achirah/shared";
import { db } from "../db/client.js";
import { personnes, categoriesContact, ambassadeurs, partagesPersonne } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { redigerMontantsPersonne } from "../lib/redaction.js";
import { genererToken } from "../lib/auth.js";
import type { AppEnv } from "../types.js";

export const contactsRoutes = new Hono<AppEnv>();

// ───────────────────────── Catégories de contact (§2.1) ─────────────────────────

const categoriesRoutes = new Hono<AppEnv>();

categoriesRoutes.get("/", async (c) => {
  const lignes = await db.select().from(categoriesContact).orderBy(categoriesContact.ordre);
  return c.json({ donnees: lignes });
});

categoriesRoutes.post(
  "/",
  exigerCapacite("approbation.gerer"),
  zValidator("json", categorieContactInsertSchema),
  async (c) => {
    const utilisateur = c.get("utilisateur")!;
    const [cree] = (await db.insert(categoriesContact).values(c.req.valid("json")).returning()) as any[];
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "categorie_contact.creer", entiteType: "categorie_contact", entiteId: cree.id, apres: cree });
    return c.json({ donnees: cree }, 201);
  },
);

categoriesRoutes.patch(
  "/:id",
  exigerCapacite("approbation.gerer"),
  zValidator("json", categorieContactInsertSchema.partial()),
  async (c) => {
    const utilisateur = c.get("utilisateur")!;
    const id = c.req.param("id");
    const [avant] = await db.select().from(categoriesContact).where(eq(categoriesContact.id, id)).limit(1);
    if (!avant) return erreurApi(c, 404, "introuvable", "Catégorie introuvable");
    // Renommable même si systeme=true — seule la suppression est bloquée (§2.1).
    const [modifie] = (await db
      .update(categoriesContact)
      .set(c.req.valid("json"))
      .where(eq(categoriesContact.id, id))
      .returning()) as any[];
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "categorie_contact.modifier", entiteType: "categorie_contact", entiteId: id, avant, apres: modifie });
    return c.json({ donnees: modifie });
  },
);

categoriesRoutes.delete("/:id", exigerCapacite("approbation.gerer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [categorie] = await db.select().from(categoriesContact).where(eq(categoriesContact.id, id)).limit(1);
  if (!categorie) return erreurApi(c, 404, "introuvable", "Catégorie introuvable");
  if (categorie.systeme) {
    return erreurApi(c, 422, "categorie_systeme", "Une catégorie système ne peut pas être supprimée, seulement renommée");
  }
  const toutes = await db.select({ id: personnes.id, categorie_ids: personnes.categorie_ids }).from(personnes);
  const utilisee = toutes.some((p) => p.categorie_ids.includes(id));
  if (utilisee) {
    return erreurApi(c, 409, "categorie_utilisee", "Cette catégorie est utilisée par au moins un contact");
  }
  await db.delete(categoriesContact).where(eq(categoriesContact.id, id));
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "categorie_contact.supprimer", entiteType: "categorie_contact", entiteId: id, avant: categorie });
  return c.body(null, 204);
});

contactsRoutes.route("/categories-contact", categoriesRoutes);

// ───────────────────────── Personnes (§4.1) ─────────────────────────

const personnesRoutes = new Hono<AppEnv>();

personnesRoutes.get("/", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const categorieId = c.req.query("categorie_id");
  const type = c.req.query("type");
  const actifParam = c.req.query("actif"); // "1" | "0" | absent (tous)
  const recherche = c.req.query("q")?.toLowerCase();

  let lignes = await db.select().from(personnes);
  if (categorieId) lignes = lignes.filter((p) => p.categorie_ids.includes(categorieId));
  if (type) lignes = lignes.filter((p) => p.type === type);
  if (actifParam === "1") lignes = lignes.filter((p) => p.actif);
  if (actifParam === "0") lignes = lignes.filter((p) => !p.actif);
  if (recherche) lignes = lignes.filter((p) => p.nom.toLowerCase().includes(recherche));

  const donnees = lignes.map((p) => redigerMontantsPersonne(p, utilisateur.role_systeme));
  return c.json({ donnees });
});

personnesRoutes.get("/:id", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [personne] = await db.select().from(personnes).where(eq(personnes.id, c.req.param("id"))).limit(1);
  if (!personne) return erreurApi(c, 404, "introuvable", "Contact introuvable");
  return c.json({ donnees: redigerMontantsPersonne(personne, utilisateur.role_systeme) });
});

personnesRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", personneInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(personnes).values(c.req.valid("json")).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "personne.creer", entiteType: "personne", entiteId: cree.id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

personnesRoutes.patch("/:id", exigerCapacite("entites.editer"), zValidator("json", personneUpdateSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(personnes).where(eq(personnes.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Contact introuvable");
  const [modifie] = (await db.update(personnes).set(c.req.valid("json")).where(eq(personnes.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "personne.modifier", entiteType: "personne", entiteId: id, avant, apres: modifie });
  return c.json({ donnees: modifie });
});

// RG-P1 : une personne référencée n'est jamais supprimée — désactivée (actif=false), grisée dans l'historique.
personnesRoutes.delete("/:id", exigerCapacite("entites.editer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [avant] = await db.select().from(personnes).where(eq(personnes.id, id)).limit(1);
  if (!avant) return erreurApi(c, 404, "introuvable", "Contact introuvable");
  const [desactive] = (await db.update(personnes).set({ actif: false }).where(eq(personnes.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "personne.desactiver", entiteType: "personne", entiteId: id, avant, apres: desactive });
  return c.json({ donnees: desactive });
});

// E32 — création d'un lien de partage signé, expirant (30 j), lecture seule, sans login.
personnesRoutes.post("/:id/partage", exigerCapacite("entites.editer"), async (c) => {
  const id = c.req.param("id");
  const [personne] = await db.select({ id: personnes.id }).from(personnes).where(eq(personnes.id, id)).limit(1);
  if (!personne) return erreurApi(c, 404, "introuvable", "Contact introuvable");
  const token = genererToken(24);
  const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(partagesPersonne).values({ personne_id: id, token, expire_at: expireAt });
  return c.json({ donnees: { token, expire_at: expireAt, chemin: `/partage/personne/${token}` } }, 201);
});

contactsRoutes.route("/personnes", personnesRoutes);

/** Accès public (sans session) à une fiche partagée — champs limités, jamais les montants. */
export const partagePersonneRoutes = new Hono<AppEnv>();
partagePersonneRoutes.get("/personne/:token", async (c) => {
  const token = c.req.param("token");
  const [lien] = await db.select().from(partagesPersonne).where(eq(partagesPersonne.token, token)).limit(1);
  if (!lien || new Date(lien.expire_at) < new Date()) {
    return erreurApi(c, 404, "lien_invalide", "Ce lien n'existe pas ou a expiré");
  }
  const [personne] = await db.select().from(personnes).where(eq(personnes.id, lien.personne_id)).limit(1);
  if (!personne) return erreurApi(c, 404, "introuvable", "Contact introuvable");
  const { tarif_jour_dt: _t, tarifs_prestations: _tp, conditions_paiement: _cp, notes: _n, ...publique } = personne;
  return c.json({ donnees: publique });
});

// ───────────────────────── Ambassadeurs / Cercle (§4.1, E24) ─────────────────────────

const ambassadeursRoutes = new Hono<AppEnv>();

ambassadeursRoutes.get("/", async (c) => {
  const statut = c.req.query("statut");
  const lignes = statut
    ? await db.select().from(ambassadeurs).where(eq(ambassadeurs.statut, statut))
    : await db.select().from(ambassadeurs);
  return c.json({ donnees: lignes });
});

ambassadeursRoutes.get("/:personneId", async (c) => {
  const [ligne] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.personne_id, c.req.param("personneId"))).limit(1);
  if (!ligne) return erreurApi(c, 404, "introuvable", "Ambassadeur introuvable");
  return c.json({ donnees: ligne });
});

ambassadeursRoutes.post("/", exigerCapacite("entites.editer"), zValidator("json", ambassadeurInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(ambassadeurs).values(c.req.valid("json")).returning()) as any[];
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "ambassadeur.creer", entiteType: "ambassadeur", entiteId: cree.personne_id, apres: cree });
  return c.json({ donnees: cree }, 201);
});

ambassadeursRoutes.patch(
  "/:personneId",
  exigerCapacite("entites.editer"),
  zValidator("json", ambassadeurUpdateSchema),
  async (c) => {
    const utilisateur = c.get("utilisateur")!;
    const personneId = c.req.param("personneId");
    const [avant] = await db.select().from(ambassadeurs).where(eq(ambassadeurs.personne_id, personneId)).limit(1);
    if (!avant) return erreurApi(c, 404, "introuvable", "Ambassadeur introuvable");
    const [modifie] = (await db
      .update(ambassadeurs)
      .set(c.req.valid("json"))
      .where(eq(ambassadeurs.personne_id, personneId))
      .returning()) as any[];
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "ambassadeur.modifier", entiteType: "ambassadeur", entiteId: personneId, avant, apres: modifie });
    return c.json({ donnees: modifie });
  },
);

contactsRoutes.route("/ambassadeurs", ambassadeursRoutes);
