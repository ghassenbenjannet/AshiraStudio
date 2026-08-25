import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { articles, articleColoris, articleSkus, articleCouts, historiqueStatuts, gammes, lookItems } from "../db/schema.js";
import { enregistrerAudit } from "../lib/audit.js";
import { calculerCogs, calculerMargePct, compterSkusAvecMesures, SKUS_AVEC_MESURES_REQUIS, STATUT_CYCLE_ARTICLE, type StatutCycleArticle, type ProchaineEtape } from "@achirah/shared";
import { creerNotification, detenteursApprobation } from "../lib/notifications.js";

export class ErreurMetier extends Error {
  code: string;
  status: 400 | 404 | 409 | 422;
  details?: Record<string, unknown>;
  constructor(status: 400 | 404 | 409 | 422, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Fait progresser un article dans son cycle de vie (§4.2) en appliquant les gates.
 * Service réutilisé tel quel par les routes HTTP et, plus tard, par un éventuel outil agent en
 * écriture (RG-PAR1a — mêmes règles, mêmes contrôles, quel que soit l'appelant).
 */
export async function transitionnerArticle(
  articleId: string,
  vers: StatutCycleArticle,
  utilisateurId: string,
  roleSysteme: string,
  organisationId: string,
  options: { essayeSur5Morphologies?: boolean; confirmerArchivageUtilise?: boolean } = {},
): Promise<{ article: typeof articles.$inferSelect; avertissements: string[] }> {
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new ErreurMetier(404, "introuvable", "Article introuvable");

  const indexActuel = STATUT_CYCLE_ARTICLE.indexOf(article.statut_cycle as StatutCycleArticle);
  const indexCible = STATUT_CYCLE_ARTICLE.indexOf(vers);
  const estSaut = indexCible > indexActuel + 1;
  if (estSaut && roleSysteme !== "admin") {
    throw new ErreurMetier(422, "saut_etape_interdit", "Impossible de sauter une étape du cycle de vie sans être admin");
  }

  const avertissements: string[] = [];

  if (vers === "prototype" && !article.fournisseur_id) {
    throw new ErreurMetier(422, "fournisseur_requis", "Un fournisseur doit être renseigné avant le statut prototype");
  }

  if (vers === "fit_valide") {
    const skus = await skusDeArticle(articleId);
    if (compterSkusAvecMesures(skus) < SKUS_AVEC_MESURES_REQUIS) {
      throw new ErreurMetier(422, "mesures_insuffisantes", "Des mesures sont requises sur au moins 3 tailles avant fit_valide");
    }
    if (!options.essayeSur5Morphologies) {
      avertissements.push("La pièce n'a pas été marquée « essayée sur 5 morphologies ».");
    }
  }

  if (vers === "production") {
    const [couts] = await db.select().from(articleCouts).where(eq(articleCouts.article_id, articleId)).limit(1);
    if (!couts) throw new ErreurMetier(422, "cogs_requis", "Le COGS complet doit être saisi avant le statut production");
    const colorisList = await db.select().from(articleColoris).where(eq(articleColoris.article_id, articleId));
    const prixFixe = colorisList.some((cl) => cl.prix_dt !== null && cl.prix_dt > 0);
    if (!prixFixe) throw new ErreurMetier(422, "prix_requis", "Un prix doit être fixé avant le statut production");

    const [gamme] = await db.select().from(gammes).where(eq(gammes.id, article.gamme_id)).limit(1);
    const cogs = calculerCogs(couts);
    const prixMin = Math.min(...colorisList.filter((cl) => cl.prix_dt).map((cl) => cl.prix_dt as number));
    const marge = calculerMargePct(prixMin, cogs);
    if (gamme && marge !== null && marge < gamme.marge_cible_pct) {
      avertissements.push(
        `Marge (${marge.toFixed(1)}%) sous la cible de la gamme ${gamme.nom} (${gamme.marge_cible_pct}%).`,
      );
      // CDC v4, Étape 0 (RG-A10) : l'avertissement ci-dessus est transitoire (perdu à la fermeture de
      // l'écran) — le signal est pourtant réel (COGS + prix + cible de gamme, jamais fabriqué,
      // RG-PROV). On le persiste aussi comme notification réelle, comblant le point relevé dans
      // DECISIONS.md (« alerte_production non automatisée, faute de signal fiable ») : ce signal-ci
      // l'est.
      for (const destinataireId of await detenteursApprobation(organisationId)) {
        await creerNotification({ utilisateurId: destinataireId, type: "alerte_production", entiteType: "article", entiteId: articleId });
      }
    }
  }

  if (vers === "stock") {
    const skus = await skusDeArticle(articleId);
    const totalProduit = skus.reduce((s, sku) => s + sku.qte_produite, 0);
    if (totalProduit <= 0) {
      throw new ErreurMetier(422, "quantites_requises", "Les quantités produites doivent être saisies par SKU avant le statut stock");
    }
  }

  if (vers === "archive") {
    const utilisations = await compterUtilisationsArticle(articleId);
    if (utilisations > 0 && !options.confirmerArchivageUtilise) {
      throw new ErreurMetier(409, "confirmation_requise", `Utilisé dans ${utilisations} shooting(s)`, { utilisations });
    }
  }

  const [modifie] = (await db
    .update(articles)
    .set({ statut_cycle: vers })
    .where(eq(articles.id, articleId))
    .returning()) as (typeof articles.$inferSelect)[];

  await db.insert(historiqueStatuts).values({ article_id: articleId, de: article.statut_cycle, vers, par: utilisateurId });
  await enregistrerAudit({
    utilisateurId,
    action: "article.transition",
    entiteType: "article",
    entiteId: articleId,
    avant: { statut_cycle: article.statut_cycle },
    apres: { statut_cycle: vers, avertissements },
  });

  return { article: modifie!, avertissements };
}

/**
 * CR-02 §C — bandeau « Prochaine étape » d'un article. Ne réévalue rien de nouveau : réutilise
 * `skusDeArticle` (même requête que la gate `fit_valide`) et `compterSkusAvecMesures`/
 * `SKUS_AVEC_MESURES_REQUIS` (mêmes fonctions partagées que `transitionnerArticle`). Seul le
 * statut `prototype` porte un message précis (c'est le seul cas listé par le CR) ; les autres
 * statuts retournent un bandeau neutre qui réutilise les libellés `catalogue.statuts.*` existants.
 */
export async function prochaineEtapeArticle(articleId: string): Promise<ProchaineEtape> {
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article) throw new ErreurMetier(404, "introuvable", "Article introuvable");

  if (article.statut_cycle === "prototype") {
    const skus = await skusDeArticle(articleId);
    const avecMesures = compterSkusAvecMesures(skus);
    if (avecMesures < SKUS_AVEC_MESURES_REQUIS) {
      return {
        etatCle: "prototype",
        manqueCle: "mesures_manquantes",
        manqueParams: { actuel: avecMesures, requis: SKUS_AVEC_MESURES_REQUIS },
        actionCle: "saisir_mesures",
      };
    }
    return { etatCle: "prototype", manqueCle: null, actionCle: null };
  }

  return { etatCle: article.statut_cycle, manqueCle: null, actionCle: null };
}

export async function skusDeArticle(articleId: string) {
  const colorisList = await db.select({ id: articleColoris.id }).from(articleColoris).where(eq(articleColoris.article_id, articleId));
  if (colorisList.length === 0) return [];
  const tous = await db.select().from(articleSkus);
  const idsColoris = new Set(colorisList.map((c) => c.id));
  return tous.filter((s) => idsColoris.has(s.article_coloris_id));
}

async function compterUtilisationsArticle(articleId: string): Promise<number> {
  // Utilisé par un look_item (donc un shooting) via un coloris de cet article.
  const colorisList = await db.select({ id: articleColoris.id }).from(articleColoris).where(eq(articleColoris.article_id, articleId));
  if (colorisList.length === 0) return 0;
  const idsColoris = colorisList.map((c) => c.id);
  const utilisations = await db.select({ id: lookItems.id }).from(lookItems).where(inArray(lookItems.article_coloris_id, idsColoris));
  return utilisations.length;
}

/** Auto-épuisement : si Σ qte_stock = 0 pour un article en `stock`, passe automatiquement à `epuise`. */
export async function verifierAutoEpuisement(articleColorisId: string, utilisateurId: string): Promise<void> {
  const [ac] = await db.select({ article_id: articleColoris.article_id }).from(articleColoris).where(eq(articleColoris.id, articleColorisId)).limit(1);
  if (!ac) return;
  const [article] = await db.select().from(articles).where(eq(articles.id, ac.article_id)).limit(1);
  if (!article || article.statut_cycle !== "stock") return;
  const skus = await skusDeArticle(ac.article_id);
  const total = skus.reduce((s, sku) => s + sku.qte_stock, 0);
  if (total === 0) {
    await db.update(articles).set({ statut_cycle: "epuise" }).where(eq(articles.id, ac.article_id));
    await db.insert(historiqueStatuts).values({ article_id: ac.article_id, de: "stock", vers: "epuise", par: utilisateurId });
    await enregistrerAudit({
      utilisateurId,
      action: "article.transition_auto",
      entiteType: "article",
      entiteId: ac.article_id,
      avant: { statut_cycle: "stock" },
      apres: { statut_cycle: "epuise", raison: "stock_zero" },
    });
  }
}

/** RG-A3 : alerte de baisse de prix si la gamme le porte — confirmation + audit. */
export async function verifierBaissePrix(
  articleColorisId: string,
  nouveauPrix: number,
  confirmer: boolean,
): Promise<{ blocage?: { message: string } }> {
  const [ac] = await db.select().from(articleColoris).where(eq(articleColoris.id, articleColorisId)).limit(1);
  if (!ac || ac.prix_dt === null || nouveauPrix >= ac.prix_dt) return {};
  const [article] = await db.select({ gamme_id: articles.gamme_id }).from(articles).where(eq(articles.id, ac.article_id)).limit(1);
  if (!article) return {};
  const [gamme] = await db.select().from(gammes).where(eq(gammes.id, article.gamme_id)).limit(1);
  if (!gamme?.alerte_baisse_prix) return {};
  if (!confirmer) {
    return { blocage: { message: gamme.message_alerte ?? "Cette gamme protège ses prix contre les baisses." } };
  }
  return {};
}
