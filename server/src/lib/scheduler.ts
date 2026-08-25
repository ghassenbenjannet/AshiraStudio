import { eq, and, ne, isNotNull, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  taches,
  utilisateurs,
  contenus,
  concurrents,
  relevesConcurrent,
  shootings,
  ambassadeurs,
  notifications,
  articles,
  campagnes,
  articleSkus,
  articleColoris,
} from "../db/schema.js";
import { creerNotification, detenteursApprobation } from "./notifications.js";
import { logger } from "./logger.js";
import { alerteLancementProductionRequise, type StatutCycleArticle } from "@achirah/shared";

const UNE_HEURE_MS = 60 * 60 * 1000;
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

function debutAujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Idempotent : ne recrée pas une notification du même type pour la même entité si une existe déjà, tous statuts confondus. */
async function dejaNotifie(utilisateurId: string, type: string, entiteId: string): Promise<boolean> {
  const [existante] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.utilisateur_id, utilisateurId), eq(notifications.type, type as any), eq(notifications.entite_id, entiteId)))
    .limit(1);
  return !!existante;
}

async function notifierUneFois(utilisateurId: string, type: any, entiteType: string, entiteId: string) {
  if (await dejaNotifie(utilisateurId, type, entiteId)) return;
  await creerNotification({ utilisateurId, type, entiteType, entiteId });
}

async function utilisateurDePersonne(personneId: string): Promise<string | null> {
  const [u] = await db.select({ id: utilisateurs.id }).from(utilisateurs).where(eq(utilisateurs.personne_id, personneId)).limit(1);
  return u?.id ?? null;
}

/** RG-transverse : tâches en retard — statut ≠ fait, échéance déjà passée. */
async function rappelTachesEnRetard() {
  const aujourdhui = debutAujourdhui();
  const lignes = await db.select().from(taches).where(ne(taches.statut, "fait"));
  for (const tache of lignes.filter((t) => t.date_echeance < aujourdhui)) {
    for (const personneId of tache.assigne_ids) {
      const utilisateurId = await utilisateurDePersonne(personneId);
      if (utilisateurId) await notifierUneFois(utilisateurId, "retard", "tache", tache.id);
    }
  }
}

/** Tâches à échéance demain — rappel J-1. */
async function rappelEcheanceJ1() {
  const demain = new Date(Date.now() + UN_JOUR_MS).toISOString().slice(0, 10);
  const lignes = await db.select().from(taches).where(and(eq(taches.date_echeance, demain), ne(taches.statut, "fait")));
  for (const tache of lignes) {
    for (const personneId of tache.assigne_ids) {
      const utilisateurId = await utilisateurDePersonne(personneId);
      if (utilisateurId) await notifierUneFois(utilisateurId, "echeance_j1", "tache", tache.id);
    }
  }
}

/** Contenus planifiés pour aujourd'hui, pas encore publiés — rappel à l'auteur. */
async function rappelPublication() {
  const aujourdhui = debutAujourdhui();
  const lignes = await db.select().from(contenus).where(eq(contenus.statut, "planifie"));
  for (const contenu of lignes.filter((ct) => ct.date_publication?.slice(0, 10) === aujourdhui)) {
    await notifierUneFois(contenu.auteur_id, "rappel_publication", "contenu", contenu.id);
  }
}

/** Concurrent sans relevé depuis plus de 7 jours — rappel de veille aux éditeurs+. */
async function rappelVeille() {
  const seuil = new Date(Date.now() - 7 * UN_JOUR_MS).toISOString().slice(0, 10);
  const tousLesConcurrents = await db.select().from(concurrents);
  const detenteurs = await detenteursApprobation();
  for (const concurrent of tousLesConcurrents) {
    const releves = await db.select().from(relevesConcurrent).where(eq(relevesConcurrent.concurrent_id, concurrent.id));
    const dernierReleve = releves.map((r) => r.date).sort().at(-1);
    if (dernierReleve && dernierReleve >= seuil) continue;
    for (const utilisateurId of detenteurs) await notifierUneFois(utilisateurId, "rappel_veille", "concurrent", concurrent.id);
  }
}

/** Shootings dont le tournage est fait mais dont des pièces empruntées ne sont pas encore rentrées. */
async function rappelRetourPieces() {
  const tousLesShootings = await db.select().from(shootings);
  for (const shooting of tousLesShootings) {
    if (shooting.pieces.length === 0) continue;
    const [tache] = await db.select().from(taches).where(eq(taches.id, shooting.tache_id)).limit(1);
    if (!tache || tache.statut !== "fait") continue;
    const rendues = new Set(shooting.retour_pieces.map((r) => r.article_sku_id));
    if (shooting.pieces.every((p) => rendues.has(p.article_sku_id))) continue;
    for (const personneId of tache.assigne_ids) {
      const utilisateurId = await utilisateurDePersonne(personneId);
      if (utilisateurId) await notifierUneFois(utilisateurId, "rappel_retour_pieces", "shooting", shooting.tache_id);
    }
  }
}

/**
 * Ambassadeur confirmé dont le kit de pièces n'a pas encore été envoyé — piloté par le statut réel
 * `confirme` (avant `kit_envoye`), déjà dans `STATUT_AMBASSADEUR` et éditable dans Cercle.tsx.
 * CDC v4, Lot 1.2 : rappel utile distinct de M27b (`rappelPostAmbassadeur` ci-dessous) — deux types
 * de notification séparés, les deux coexistent.
 */
async function rappelKitAEnvoyer() {
  const tousLesAmbassadeurs = await db.select().from(ambassadeurs).where(eq(ambassadeurs.statut, "confirme"));
  const detenteurs = await detenteursApprobation();
  for (const ambassadeur of tousLesAmbassadeurs) {
    for (const utilisateurId of detenteurs) await notifierUneFois(utilisateurId, "rappel_kit_a_envoyer", "personne", ambassadeur.personne_id);
  }
}

/**
 * M27b (CDC v4, Lot 1.2) : kit envoyé (`statut = kit_envoye`), aucun post enregistré, et on est à
 * J+7 ou plus après la date de drop de la campagne d'où viennent les pièces du kit. L'ambassadeur
 * ne porte pas de campagne_id direct : le drop se résout depuis ses pièces (SKU → coloris → article
 * → chapitre_id), la même chaîne déjà utilisée ailleurs (ex. `compterUtilisationsArticle`) — jamais
 * un champ inventé. Si le kit touche plusieurs chapitres, un seul suffit à J+7 pour déclencher (le
 * rappel lui-même est idempotent par ambassadeur, pas par chapitre).
 */
async function rappelPostAmbassadeur() {
  const aujourdhui = debutAujourdhui();
  const tousLesAmbassadeurs = await db.select().from(ambassadeurs).where(eq(ambassadeurs.statut, "kit_envoye"));
  const detenteurs = await detenteursApprobation();
  for (const ambassadeur of tousLesAmbassadeurs) {
    if (ambassadeur.posts.length > 0 || ambassadeur.pieces.length === 0) continue;

    const skuIds = ambassadeur.pieces.map((p) => p.article_sku_id);
    const skus = await db.select().from(articleSkus).where(inArray(articleSkus.id, skuIds));
    const colorisIds = Array.from(new Set(skus.map((s) => s.article_coloris_id)));
    if (colorisIds.length === 0) continue;
    const colorisList = await db.select().from(articleColoris).where(inArray(articleColoris.id, colorisIds));
    const articleIds = Array.from(new Set(colorisList.map((c) => c.article_id)));
    if (articleIds.length === 0) continue;
    const articlesDuKit = await db.select().from(articles).where(inArray(articles.id, articleIds));
    const chapitreIds = Array.from(new Set(articlesDuKit.map((a) => a.chapitre_id).filter((id): id is string => !!id)));
    if (chapitreIds.length === 0) continue;
    const campagnesDuKit = await db.select().from(campagnes).where(inArray(campagnes.id, chapitreIds));

    const dropAtteintJ7 = campagnesDuKit.some((c) => {
      const j7 = new Date(c.date_fin);
      j7.setDate(j7.getDate() + 7);
      return aujourdhui >= j7.toISOString().slice(0, 10);
    });
    if (!dropAtteintJ7) continue;

    for (const utilisateurId of detenteurs) await notifierUneFois(utilisateurId, "rappel_post_ambassadeur", "personne", ambassadeur.personne_id);
  }
}

/**
 * RG-A10 (CDC v4, Lot 1.1) : tâche d'alerte (pas une notification) quand le lancement en production
 * d'un article risque de compromettre le drop de son chapitre. `date_drop` = `date_fin` de la
 * campagne (jalon « Drop » du rituel à l'offset 0 de `date_fin`, §5.7). Sans `delai_production_jours`,
 * aucune alerte n'est inventée (RG-PROV). Idempotence par (article_id, campagne_id, type=livraison) :
 * jamais recréée, même après redémarrage — la même discipline que `dejaNotifie`, appliquée aux tâches.
 */
async function alerteLancementProduction() {
  const aujourdhui = debutAujourdhui();
  const articlesDeChapitre = await db.select().from(articles).where(isNotNull(articles.chapitre_id));
  const admins = await db.select({ personne_id: utilisateurs.personne_id }).from(utilisateurs).where(eq(utilisateurs.role_systeme, "admin"));
  const adminsPersonneIds = admins.map((a) => a.personne_id).filter((id): id is string => !!id);

  for (const article of articlesDeChapitre) {
    if (article.delai_production_jours === null || article.delai_production_jours === undefined) continue;
    const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, article.chapitre_id!)).limit(1);
    if (!campagne) continue;
    if (!alerteLancementProductionRequise(aujourdhui, campagne.date_fin, article.delai_production_jours, article.statut_cycle as StatutCycleArticle)) {
      continue;
    }

    const [existante] = await db
      .select({ id: taches.id })
      .from(taches)
      .where(and(eq(taches.article_id, article.id), eq(taches.campagne_id, campagne.id), eq(taches.type, "livraison")))
      .limit(1);
    if (existante) continue;

    await db.insert(taches).values({
      campagne_id: campagne.id,
      article_id: article.id,
      titre: `Alerte lancement production — ${article.reference}`,
      type: "livraison",
      date_echeance: aujourdhui,
      assigne_ids: adminsPersonneIds,
      statut: "todo",
      description: `Le lancement en production de ${article.reference} doit démarrer sans délai pour tenir le drop du ${campagne.date_fin} (délai de production : ${article.delai_production_jours} j). Statut actuel : ${article.statut_cycle}.`,
    });
  }
}

async function executerUnTour() {
  const etapes: [string, () => Promise<void>][] = [
    ["retard", rappelTachesEnRetard],
    ["echeance_j1", rappelEcheanceJ1],
    ["rappel_publication", rappelPublication],
    ["rappel_veille", rappelVeille],
    ["rappel_retour_pieces", rappelRetourPieces],
    ["rappel_kit_a_envoyer", rappelKitAEnvoyer],
    ["rappel_post_ambassadeur", rappelPostAmbassadeur],
    ["alerte_lancement_production", alerteLancementProduction],
  ];
  for (const [nom, fn] of etapes) {
    try {
      await fn();
    } catch (err) {
      logger.error({ err, tache: nom }, "Échec d'un tour de planificateur de rappels");
    }
  }
}

/** Planificateur in-process (§8.1 : un seul processus déployé, pas de worker séparé) — un tour immédiat puis toutes les heures. */
export function demarrerPlanificateurRappels() {
  void executerUnTour();
  setInterval(() => void executerUnTour(), UNE_HEURE_MS);
}
