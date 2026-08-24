import { Hono } from "hono";
import {
  gammeInsertSchema,
  gammeUpdateSchema,
  categorieProduitInsertSchema,
  colorisInsertSchema,
  matiereInsertSchema,
  codeEntretienInsertSchema,
  grilleTailleInsertSchema,
  listeSimpleInsertSchema,
  modeleChecklistInsertSchema,
  registreInsertSchema,
  typeCampagneInsertSchema,
  modeleRituelInsertSchema,
} from "@achirah/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  gammes,
  articles,
  categoriesProduit,
  coloris,
  matieres,
  codesEntretien,
  grillesTaille,
  listesParametrables,
  modelesChecklist,
  registres,
  typesCampagne,
  modelesRituel,
} from "../db/schema.js";
import { creerRoutesReferentiel } from "../lib/referentiel-crud.js";
import type { AppEnv } from "../types.js";

/**
 * Paramètres → Référentiels (Partie V). RG-PARAM2 : le produit ne connaît aucune marque —
 * gammes, catégories, registres, types de campagne, rituels sont ici, jamais dans le code.
 * Non listé explicitement en §8.2 (qui ne couvre pas les référentiels) — voir DECISIONS.md.
 */
export const referentielsRoutes = new Hono<AppEnv>();

referentielsRoutes.route(
  "/gammes",
  creerRoutesReferentiel({
    table: gammes,
    entiteType: "gamme",
    insertSchema: gammeInsertSchema,
    updateSchema: gammeUpdateSchema,
    // §5.0 : le code_prefixe devient immuable dès le premier article créé (préserve la cohérence des références).
    validerAvantModification: async (id, corps) => {
      if (!("code_prefixe" in corps)) return null;
      const [unArticle] = await db.select({ id: articles.id }).from(articles).where(eq(articles.gamme_id, id)).limit(1);
      if (unArticle) return "Le préfixe est verrouillé : au moins un article utilise déjà cette gamme.";
      return null;
    },
  }),
);

referentielsRoutes.route(
  "/categories-produit",
  creerRoutesReferentiel({
    table: categoriesProduit,
    entiteType: "categorie_produit",
    insertSchema: categorieProduitInsertSchema,
    updateSchema: categorieProduitInsertSchema.partial(),
  }),
);

referentielsRoutes.route(
  "/coloris",
  creerRoutesReferentiel({
    table: coloris,
    entiteType: "coloris",
    insertSchema: colorisInsertSchema,
    updateSchema: colorisInsertSchema.partial(),
    colonneTri: coloris.nom_commercial,
  }),
);

referentielsRoutes.route(
  "/matieres",
  creerRoutesReferentiel({
    table: matieres,
    entiteType: "matiere",
    insertSchema: matiereInsertSchema,
    updateSchema: matiereInsertSchema.partial(),
    colonneTri: matieres.nom,
  }),
);

referentielsRoutes.route(
  "/codes-entretien",
  creerRoutesReferentiel({
    table: codesEntretien,
    entiteType: "code_entretien",
    insertSchema: codeEntretienInsertSchema,
    updateSchema: codeEntretienInsertSchema.partial(),
  }),
);

referentielsRoutes.route(
  "/grilles-taille",
  creerRoutesReferentiel({
    table: grillesTaille,
    entiteType: "grille_taille",
    insertSchema: grilleTailleInsertSchema,
    updateSchema: grilleTailleInsertSchema.partial(),
    colonneTri: grillesTaille.nom,
  }),
);

referentielsRoutes.route(
  "/postes-budgetaires",
  creerRoutesReferentiel({
    table: listesParametrables,
    entiteType: "poste_budgetaire",
    insertSchema: listeSimpleInsertSchema,
    updateSchema: listeSimpleInsertSchema.partial(),
    valeursFixes: { categorie: "poste_budgetaire" },
  }),
);

referentielsRoutes.route(
  "/canaux",
  creerRoutesReferentiel({
    table: listesParametrables,
    entiteType: "canal",
    insertSchema: listeSimpleInsertSchema,
    updateSchema: listeSimpleInsertSchema.partial(),
    valeursFixes: { categorie: "canal" },
  }),
);

referentielsRoutes.route(
  "/plateformes-contenu",
  creerRoutesReferentiel({
    table: listesParametrables,
    entiteType: "plateforme_contenu",
    insertSchema: listeSimpleInsertSchema,
    updateSchema: listeSimpleInsertSchema.partial(),
    valeursFixes: { categorie: "plateforme_contenu" },
  }),
);

referentielsRoutes.route(
  "/occasions",
  creerRoutesReferentiel({
    table: listesParametrables,
    entiteType: "occasion",
    insertSchema: listeSimpleInsertSchema,
    updateSchema: listeSimpleInsertSchema.partial(),
    valeursFixes: { categorie: "occasion" },
  }),
);

referentielsRoutes.route(
  "/modeles-checklist",
  creerRoutesReferentiel({
    table: modelesChecklist,
    entiteType: "modele_checklist",
    insertSchema: modeleChecklistInsertSchema,
    updateSchema: modeleChecklistInsertSchema.partial(),
    colonneTri: modelesChecklist.nom,
  }),
);

referentielsRoutes.route(
  "/registres",
  creerRoutesReferentiel({
    table: registres,
    entiteType: "registre",
    insertSchema: registreInsertSchema,
    updateSchema: registreInsertSchema.partial(),
  }),
);

referentielsRoutes.route(
  "/types-campagne",
  creerRoutesReferentiel({
    table: typesCampagne,
    entiteType: "type_campagne",
    insertSchema: typeCampagneInsertSchema,
    updateSchema: typeCampagneInsertSchema.partial(),
  }),
);

referentielsRoutes.route(
  "/modeles-rituel",
  creerRoutesReferentiel({
    table: modelesRituel,
    entiteType: "modele_rituel",
    insertSchema: modeleRituelInsertSchema,
    updateSchema: modeleRituelInsertSchema.partial(),
    colonneTri: modelesRituel.nom,
  }),
);
