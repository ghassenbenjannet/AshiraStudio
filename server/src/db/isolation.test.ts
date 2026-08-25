import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, executerAvecOrganisation, pgClient } from "./client.js";
import { categoriesContact, organisations } from "./schema.js";

/**
 * CDC v4, Lot 3.3 — Gate C1.3 (bloquant) : preuve automatisée que l'isolation multi-organisation
 * est appliquée par PostgreSQL lui-même (Row Level Security), pas seulement par le code applicatif.
 * Se connecte avec les identifiants réels du serveur (`DATABASE_URL`, rôle `achirah_app` non
 * superutilisateur — voir `db/provision-role.ts`) : si la RLS n'était pas posée (`db:rls` non
 * exécuté) ou si le rôle était superutilisateur/propriétaire des tables, ce test échouerait, ce qui
 * en fait une garde-fou réel de la CI, pas une simulation.
 */
describe("isolation multi-organisation (RLS)", () => {
  let orgAId: string;
  let orgBId: string;

  beforeAll(async () => {
    const suffixe = crypto.randomUUID().slice(0, 8);
    const [orgA] = await db.insert(organisations).values({ nom: `Test isolation A ${suffixe}`, slug: `test-isolation-a-${suffixe}` }).returning();
    const [orgB] = await db.insert(organisations).values({ nom: `Test isolation B ${suffixe}`, slug: `test-isolation-b-${suffixe}` }).returning();
    if (!orgA || !orgB) throw new Error("échec de la création des organisations de test");
    orgAId = orgA.id;
    orgBId = orgB.id;

    await executerAvecOrganisation(orgAId, async () => {
      await db.insert(categoriesContact).values({ nom: "Catégorie A" });
    });
    await executerAvecOrganisation(orgBId, async () => {
      await db.insert(categoriesContact).values({ nom: "Catégorie B" });
    });
  });

  afterAll(async () => {
    await executerAvecOrganisation(orgAId, async () => {
      await db.delete(categoriesContact).where(eq(categoriesContact.organisation_id, orgAId));
    });
    await executerAvecOrganisation(orgBId, async () => {
      await db.delete(categoriesContact).where(eq(categoriesContact.organisation_id, orgBId));
    });
    await db.delete(organisations).where(eq(organisations.id, orgAId));
    await db.delete(organisations).where(eq(organisations.id, orgBId));
    await pgClient.end();
  });

  it("ne voit que ses propres lignes en lecture", async () => {
    const vuParA = await executerAvecOrganisation(orgAId, () => db.select().from(categoriesContact));
    const vuParB = await executerAvecOrganisation(orgBId, () => db.select().from(categoriesContact));

    expect(vuParA.map((r) => r.nom)).toEqual(["Catégorie A"]);
    expect(vuParB.map((r) => r.nom)).toEqual(["Catégorie B"]);
  });

  it("ne peut pas lire une ligne d'une autre organisation par son id direct", async () => {
    const [ligneA] = await executerAvecOrganisation(orgAId, () => db.select().from(categoriesContact).where(eq(categoriesContact.organisation_id, orgAId)));
    if (!ligneA) throw new Error("ligne A introuvable, setup invalide");

    const introuvableDepuisB = await executerAvecOrganisation(orgBId, () =>
      db.select().from(categoriesContact).where(eq(categoriesContact.id, ligneA.id)),
    );
    expect(introuvableDepuisB).toEqual([]);
  });

  it("ne peut pas modifier ou supprimer une ligne d'une autre organisation", async () => {
    const [ligneA] = await executerAvecOrganisation(orgAId, () => db.select().from(categoriesContact).where(eq(categoriesContact.organisation_id, orgAId)));
    if (!ligneA) throw new Error("ligne A introuvable, setup invalide");

    const miseAJour = await executerAvecOrganisation(orgBId, () =>
      db.update(categoriesContact).set({ nom: "Piraté" }).where(eq(categoriesContact.id, ligneA.id)).returning(),
    );
    expect(miseAJour).toEqual([]);

    const suppression = await executerAvecOrganisation(orgBId, () =>
      db.delete(categoriesContact).where(eq(categoriesContact.id, ligneA.id)).returning(),
    );
    expect(suppression).toEqual([]);

    const toujoursLaDepuisA = await executerAvecOrganisation(orgAId, () => db.select().from(categoriesContact).where(eq(categoriesContact.id, ligneA.id)));
    expect(toujoursLaDepuisA).toHaveLength(1);
    expect(toujoursLaDepuisA[0]?.nom).toBe("Catégorie A");
  });

  it("refuse toute requête sur une table métier hors contexte d'organisation (échec fermé)", async () => {
    await expect(db.select().from(categoriesContact)).rejects.toThrow();
  });
});
