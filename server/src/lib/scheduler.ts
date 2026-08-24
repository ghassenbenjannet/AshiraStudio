import { eq, and, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { taches, utilisateurs, contenus, concurrents, relevesConcurrent, shootings, ambassadeurs, notifications } from "../db/schema.js";
import { creerNotification, detenteursApprobation } from "./notifications.js";
import { logger } from "./logger.js";

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
 * Ambassadeur confirmé dont le kit de pièces n'a pas encore été envoyé — CDC v4, Étape 0 : piloté
 * par le statut réel `kit_envoye` (déjà dans `STATUT_AMBASSADEUR` et éditable dans Cercle.tsx),
 * plutôt que par `pieces.length === 0`, un champ que rien n'écrit jamais après la création et qui
 * ne pouvait donc plus jamais s'éteindre.
 */
async function rappelKitAmbassadeur() {
  const tousLesAmbassadeurs = await db.select().from(ambassadeurs).where(eq(ambassadeurs.statut, "confirme"));
  const detenteurs = await detenteursApprobation();
  for (const ambassadeur of tousLesAmbassadeurs) {
    for (const utilisateurId of detenteurs) await notifierUneFois(utilisateurId, "rappel_kit_ambassadeur", "personne", ambassadeur.personne_id);
  }
}

async function executerUnTour() {
  const etapes: [string, () => Promise<void>][] = [
    ["retard", rappelTachesEnRetard],
    ["echeance_j1", rappelEcheanceJ1],
    ["rappel_publication", rappelPublication],
    ["rappel_veille", rappelVeille],
    ["rappel_retour_pieces", rappelRetourPieces],
    ["rappel_kit_ambassadeur", rappelKitAmbassadeur],
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
