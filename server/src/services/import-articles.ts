import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { articles, articleColoris, articleSkus, gammes, categoriesProduit, coloris as colorisTable, grillesTaille } from "../db/schema.js";
import {
  ARTICLE_IMPORT_HEADERS_REQUISES,
  REFERENCE_ARTICLE_REGEX,
  STATUT_CYCLE_ARTICLE,
  type ArticleImportLigne,
  type ArticleImportResultatLigne,
} from "@achirah/shared";
import { randomUUID } from "node:crypto";

/** Détecte `,` ou `;` puis découpe le CSV — gère les champs entre guillemets (échappement `""`). */
export function parseCsv(texte: string): { entetes: string[]; lignes: string[][] } {
  const premierSaut = texte.indexOf("\n");
  const premiereLigne = premierSaut === -1 ? texte : texte.slice(0, premierSaut);
  const separateur = (premiereLigne.match(/;/g)?.length ?? 0) > (premiereLigne.match(/,/g)?.length ?? 0) ? ";" : ",";

  const lignesBrutes = texte.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const decouper = (ligne: string): string[] => {
    const champs: string[] = [];
    let courant = "";
    let dansGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const car = ligne[i];
      if (dansGuillemets) {
        if (car === '"' && ligne[i + 1] === '"') {
          courant += '"';
          i++;
        } else if (car === '"') {
          dansGuillemets = false;
        } else {
          courant += car;
        }
      } else if (car === '"') {
        dansGuillemets = true;
      } else if (car === separateur) {
        champs.push(courant.trim());
        courant = "";
      } else {
        courant += car;
      }
    }
    champs.push(courant.trim());
    return champs;
  };

  const toutes = lignesBrutes.map(decouper);
  return { entetes: toutes[0]?.map((h) => h.toLowerCase()) ?? [], lignes: toutes.slice(1) };
}

export interface RapportImport {
  resultats: ArticleImportResultatLigne[];
  nb_nouveaux: number;
  nb_mises_a_jour: number;
  nb_erreurs: number;
}

/**
 * Import CSV catalogue (§4.2). En `nouveau`, crée l'article + un coloris/SKU par défaut à partir
 * des colonnes `prix`/`tailles` — ces deux colonnes n'ont pas de champ au niveau article dans le
 * modèle de données (seul article_coloris porte un prix) ; voir DECISIONS.md.
 */
export async function importerArticles(texte: string, dryRun: boolean, utilisateurId: string): Promise<RapportImport> {
  const { entetes, lignes } = parseCsv(texte);
  const manquantes = ARTICLE_IMPORT_HEADERS_REQUISES.filter((h) => !entetes.includes(h));
  if (manquantes.length > 0) {
    throw new Error(`En-têtes requises manquantes : ${manquantes.join(", ")}`);
  }

  const toutesGammes = await db.select().from(gammes);
  const toutesCategories = await db.select().from(categoriesProduit);
  const tousColoris = await db.select().from(colorisTable);
  const toutesGrilles = await db.select().from(grillesTaille);
  const articlesExistants = await db.select().from(articles);

  const resultats: ArticleImportResultatLigne[] = [];

  for (let i = 0; i < lignes.length; i++) {
    const brute = lignes[i]!;
    const objet: Record<string, string> = {};
    entetes.forEach((h, idx) => (objet[h] = brute[idx] ?? ""));
    const donnees = objet as unknown as ArticleImportLigne;
    const numeroLigne = i + 2; // 1 = en-tête

    const motifs: string[] = [];
    if (!REFERENCE_ARTICLE_REGEX.test(donnees.reference?.toUpperCase() ?? "")) {
      motifs.push(`référence invalide « ${donnees.reference} » (attendu PREFIXE-NN)`);
    }
    const gamme = toutesGammes.find(
      (g) => g.nom.toLowerCase() === donnees.gamme?.toLowerCase() || g.code_prefixe.toLowerCase() === donnees.gamme?.toLowerCase(),
    );
    if (!gamme) motifs.push(`gamme inconnue « ${donnees.gamme} »`);
    const prix = Number(donnees.prix?.replace(",", "."));
    if (!donnees.prix || Number.isNaN(prix) || prix <= 0) motifs.push(`prix invalide « ${donnees.prix} »`);
    if (!donnees.nom?.trim()) motifs.push("nom manquant");

    if (motifs.length > 0) {
      resultats.push({ ligne: numeroLigne, action: "erreur", motif: motifs.join(" ; "), donnees });
      continue;
    }

    const existant = articlesExistants.find((a) => a.reference.toUpperCase() === donnees.reference.toUpperCase());
    resultats.push({ ligne: numeroLigne, action: existant ? "mise_a_jour" : "nouveau", donnees });
  }

  if (dryRun) {
    return recapituler(resultats);
  }

  for (const resultat of resultats) {
    if (resultat.action === "erreur") continue;
    const donnees = resultat.donnees;
    const gamme = toutesGammes.find(
      (g) => g.nom.toLowerCase() === donnees.gamme.toLowerCase() || g.code_prefixe.toLowerCase() === donnees.gamme.toLowerCase(),
    )!;
    const categorie = donnees.categorie
      ? toutesCategories.find((cat) => cat.nom.toLowerCase() === donnees.categorie!.toLowerCase())
      : undefined;
    const prix = Number(donnees.prix.replace(",", "."));
    const statutCsv = donnees.statut?.toLowerCase();
    const statutCycle = (STATUT_CYCLE_ARTICLE as readonly string[]).includes(statutCsv ?? "") ? (statutCsv as any) : "idee";
    const numerote = ["1", "true", "oui", "vrai"].includes((donnees.numerote ?? "").toLowerCase());
    const numerotationTotal = donnees.numerotation_total ? Number(donnees.numerotation_total) : null;

    if (resultat.action === "nouveau") {
      if (!categorie) {
        // Sans catégorie résoluble, l'article est créé sans SKU générable — la catégorie sera
        // renseignée manuellement sur la fiche article.
        await db.insert(articles).values({
          reference: donnees.reference.toUpperCase(),
          nom: donnees.nom,
          gamme_id: gamme.id,
          categorie_id: toutesCategories[0]!.id,
          statut_cycle: statutCycle,
          numerote,
          numerotation_total: numerotationTotal,
          notes_interne: donnees.notes || null,
        });
        continue;
      }
      const [article] = (await db
        .insert(articles)
        .values({
          reference: donnees.reference.toUpperCase(),
          nom: donnees.nom,
          gamme_id: gamme.id,
          categorie_id: categorie.id,
          statut_cycle: statutCycle,
          numerote,
          numerotation_total: numerotationTotal,
          notes_interne: donnees.notes || null,
        })
        .returning()) as any[];

      const premierColoris = tousColoris[0];
      if (premierColoris) {
        const [ac] = (await db
          .insert(articleColoris)
          .values({ article_id: article.id, coloris_id: premierColoris.id, prix_dt: prix, statut: "actif", ordre: 0 })
          .returning()) as any[];

        const grille = toutesGrilles.find((g) => g.id === categorie.grille_tailles_id);
        const taillesDemandees = donnees.tailles?.split(/[/,]/).map((t) => t.trim().toUpperCase()).filter(Boolean);
        const tailles = taillesDemandees?.length ? taillesDemandees : grille?.valeurs ?? [];
        if (tailles.length) {
          await db.insert(articleSkus).values(
            tailles.map((taille) => ({ id: randomUUID(), article_coloris_id: ac.id, taille, qte_produite: 0, qte_stock: 0, mesures: {} })),
          );
        }
      }
    } else {
      await db
        .update(articles)
        .set({
          nom: donnees.nom,
          gamme_id: gamme.id,
          ...(categorie ? { categorie_id: categorie.id } : {}),
          numerote,
          numerotation_total: numerotationTotal,
          notes_interne: donnees.notes || null,
        })
        .where(eq(articles.reference, donnees.reference.toUpperCase()));
    }
  }

  return recapituler(resultats);
}

function recapituler(resultats: ArticleImportResultatLigne[]): RapportImport {
  return {
    resultats,
    nb_nouveaux: resultats.filter((r) => r.action === "nouveau").length,
    nb_mises_a_jour: resultats.filter((r) => r.action === "mise_a_jour").length,
    nb_erreurs: resultats.filter((r) => r.action === "erreur").length,
  };
}
