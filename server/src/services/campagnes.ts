import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { campagnes, typesCampagne, modelesRituel, taches, budgetLignes, contenus, metriqueSnapshots, lecons } from "../db/schema.js";
import { enregistrerAudit } from "../lib/audit.js";
import { ErreurMetier } from "./catalogue.js";
import { campagneResultatsManquants, tacheEnRetard, type ProchaineEtape } from "@achirah/shared";

/** RG-ECO1 : kpi_cibles verrouillées au passage `active` — une cible écrite après les résultats n'a aucune valeur. */
export async function activerCampagne(campagneId: string, utilisateurId: string) {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId)).limit(1);
  if (!campagne) throw new ErreurMetier(404, "introuvable", "Campagne introuvable");
  // Idempotent sur le résultat (statut active + KPI verrouillées), pas sur le statut de départ :
  // une campagne déjà `active` (ex. seedée ainsi) mais dont les KPI ne sont pas encore verrouillées
  // doit tout de même se faire verrouiller par un appel explicite à /activer.
  if (campagne.statut === "active" && campagne.kpi_cibles_verrouillees) return campagne;

  const [modifiee] = (await db
    .update(campagnes)
    .set({ statut: "active", kpi_cibles_verrouillees: true })
    .where(eq(campagnes.id, campagneId))
    .returning()) as (typeof campagnes.$inferSelect)[];

  await enregistrerAudit({
    utilisateurId,
    action: "campagne.activer",
    entiteType: "campagne",
    entiteId: campagneId,
    avant: { statut: campagne.statut, kpi_cibles: campagne.kpi_cibles },
    apres: { statut: "active", kpi_cibles_verrouillees: true },
  });
  return modifiee!;
}

/** RG-ECO2 : livree → fermee exige le Rapport de campagne (3 champs) ET les résultats pour chaque KPI ciblé. */
export async function fermerCampagne(
  campagneId: string,
  rapport: { marche: string; pas_marche: string; decisions: string },
  utilisateurId: string,
) {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId)).limit(1);
  if (!campagne) throw new ErreurMetier(404, "introuvable", "Campagne introuvable");
  if (campagne.statut !== "livree") {
    throw new ErreurMetier(422, "statut_invalide", "Seule une campagne livrée peut être fermée");
  }

  const manquants = campagneResultatsManquants(campagne);
  if (manquants.length > 0) {
    throw new ErreurMetier(422, "kpi_manquants", `Résultats manquants pour : ${manquants.join(", ")}`, { manquants });
  }

  const [modifiee] = (await db
    .update(campagnes)
    .set({ statut: "fermee", rapport })
    .where(eq(campagnes.id, campagneId))
    .returning()) as (typeof campagnes.$inferSelect)[];

  await enregistrerAudit({ utilisateurId, action: "campagne.fermer", entiteType: "campagne", entiteId: campagneId, apres: { rapport } });

  // RG-LC4 : chaque fermeture fait progresser le compteur des leçons "perdant" actives non
  // reconfirmées — au-delà de 2, le front propose leur archivage (jamais automatique).
  const leconsPerdantes = await db.select().from(lecons).where(eq(lecons.type, "perdant"));
  for (const lecon of leconsPerdantes.filter((l) => l.statut === "active")) {
    await db.update(lecons).set({ fermetures_sans_reconfirmation: lecon.fermetures_sans_reconfirmation + 1 }).where(eq(lecons.id, lecon.id));
  }

  return modifiee!;
}

/** RG-ECO3 : campagnes livrées non fermées depuis > 21 jours (dette de mesure). */
export async function detteDeMesure() {
  const seuil = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const toutes = await db.select().from(campagnes).where(eq(campagnes.statut, "livree"));
  return toutes.filter((c) => c.updated_at < seuil);
}

/** §4.3 — Rituel auto : jalons du modèle deviennent des tâches, offsets relatifs à date_fin. */
export async function genererRituel(campagneId: string, utilisateurId: string) {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId)).limit(1);
  if (!campagne) throw new ErreurMetier(404, "introuvable", "Campagne introuvable");
  const [typeCampagne] = await db.select().from(typesCampagne).where(eq(typesCampagne.id, campagne.type_campagne_id)).limit(1);
  if (!typeCampagne?.modele_rituel_id) {
    throw new ErreurMetier(422, "aucun_rituel", "Ce type de campagne ne porte pas de modèle de rituel");
  }
  const [modele] = await db.select().from(modelesRituel).where(eq(modelesRituel.id, typeCampagne.modele_rituel_id)).limit(1);
  if (!modele) throw new ErreurMetier(404, "introuvable", "Modèle de rituel introuvable");

  const dateFin = new Date(campagne.date_fin);
  const nouvellesTaches = modele.jalons.map((jalon) => {
    const date = new Date(dateFin);
    date.setDate(date.getDate() + jalon.offset_jours);
    return {
      id: randomUUID(),
      campagne_id: campagneId,
      titre: jalon.libelle,
      type: jalon.type_tache,
      date_echeance: date.toISOString().slice(0, 10),
      assigne_ids: [],
      lieu: null,
      statut: "todo" as const,
      done_at: null,
      description: null,
    };
  });

  if (nouvellesTaches.length > 0) await db.insert(taches).values(nouvellesTaches);
  await enregistrerAudit({ utilisateurId, action: "campagne.generer_rituel", entiteType: "campagne", entiteId: campagneId, apres: { nb_taches: nouvellesTaches.length } });
  return nouvellesTaches;
}

/**
 * CR-02 §C — bandeau « Prochaine étape » d'une campagne. Lecture seule, aucune nouvelle donnée :
 * réutilise `campagne.description`/`kpi_cibles` (déjà là), les tâches déjà générées par le rituel
 * (`genererRituel`) filtrées par `tacheEnRetard` (même fonction partagée que le cockpit Aujourd'hui),
 * les contenus déjà liés à la campagne, et `campagneResultatsManquants` — la même fonction qui bloque
 * `fermerCampagne` (RG-ECO2), un seul endroit de vérité pour "résultats manquants".
 */
export async function prochaineEtapeCampagne(campagneId: string): Promise<ProchaineEtape> {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId)).limit(1);
  if (!campagne) throw new ErreurMetier(404, "introuvable", "Campagne introuvable");

  if (campagne.statut === "preparation") {
    if (!campagne.description) return { etatCle: "preparation", manqueCle: "decrire_strategie", actionCle: null };
    if (Object.keys(campagne.kpi_cibles ?? {}).length === 0) {
      return { etatCle: "preparation", manqueCle: "fixer_cibles", actionCle: null };
    }
    const tachesCampagne = await db.select({ id: taches.id }).from(taches).where(eq(taches.campagne_id, campagneId));
    if (tachesCampagne.length === 0) {
      return { etatCle: "preparation", manqueCle: "generer_rituel", actionCle: "generer_rituel" };
    }
    return { etatCle: "preparation", manqueCle: null, actionCle: "activer" };
  }

  if (campagne.statut === "active") {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const tachesCampagne = await db.select().from(taches).where(eq(taches.campagne_id, campagneId));
    const jRestant = Math.round((new Date(campagne.date_fin).getTime() - new Date(aujourdhui).setHours(0, 0, 0, 0)) / 86400000);
    const jalonsFaits = tachesCampagne.filter((t) => t.statut === "fait").length;
    const jalonsEnRetard = tachesCampagne.filter((t) => tacheEnRetard(t as any, aujourdhui)).length;
    const contenusCampagne = await db.select({ statut: contenus.statut }).from(contenus).where(eq(contenus.campagne_id, campagneId));
    const contenusEnRevue = contenusCampagne.filter((c) => c.statut === "en_revue").length;
    return {
      etatCle: "active_resume",
      etatParams: { jRestant, jalonsFaits, jalonsTotal: tachesCampagne.length, contenusEnRevue },
      manqueCle: jalonsEnRetard > 0 ? "jalons_retard" : null,
      manqueParams: jalonsEnRetard > 0 ? { n: jalonsEnRetard } : undefined,
      actionCle: jalonsEnRetard > 0 ? "voir_retards" : null,
    };
  }

  if (campagne.statut === "livree") {
    const manquants = campagneResultatsManquants(campagne);
    const jours = Math.round((Date.now() - new Date(campagne.updated_at).getTime()) / 86400000);
    if (manquants.length > 0) {
      return {
        etatCle: "livree_depuis",
        etatParams: { jours },
        manqueCle: "resultats_manquants",
        manqueParams: { n: manquants.length },
        actionCle: "saisir_resultats",
      };
    }
    return { etatCle: "livree_prete", manqueCle: null, actionCle: "fermer" };
  }

  return { etatCle: campagne.statut, manqueCle: null, actionCle: null };
}

const DOMAINES_AUTORISES = ["achirah.com", "achirah.tn"];

/** Champ d'ajout intelligent (§4.3) : seuls achirah.com/achirah.tn sont fetchés, timeout 5s, 1 requête. */
export async function extraireMetadonneesUrl(url: string): Promise<{ titre_extrait: string | null; image_extraite_url: string | null }> {
  let hote: string;
  try {
    hote = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    throw new ErreurMetier(422, "url_invalide", "URL invalide");
  }
  if (!DOMAINES_AUTORISES.includes(hote)) {
    throw new ErreurMetier(422, "domaine_refuse", "Seuls les liens boutique Achirah sont acceptés");
  }

  try {
    const reponse = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await reponse.text();
    const titre = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
    const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
    return { titre_extrait: titre, image_extraite_url: image };
  } catch {
    // Échec → référence URL nue à compléter à la main (§4.3).
    return { titre_extrait: null, image_extraite_url: null };
  }
}

interface ChiffreConsolide {
  valeur: number | null;
  methode: string;
}

function agregerKpi(snapshots: (typeof metriqueSnapshots.$inferSelect)[], cle: string): ChiffreConsolide {
  const pertinents = snapshots.filter((s) => typeof s.kpis[cle] === "number");
  if (pertinents.length === 0) return { valeur: null, methode: "aucune donnée" };
  const valeur = pertinents.reduce((somme, s) => somme + (s.kpis[cle] as number), 0);
  const methodes = new Set(pertinents.map((s) => (s.source === "manuel" ? "saisie manuelle" : "API")));
  return { valeur, methode: [...methodes].join(" + ") };
}

/**
 * Consolidation par campagne (§4.8) : budget réel (Σ budget_ligne), reach cumulé, contenus publiés,
 * sessions/commandes/CA attribués (Σ kpis des snapshots liés à cette campagne), ROAS quand
 * calculable. RG-M1 : chaque chiffre affiche sa méthode. RG-M2 : attribution dernier clic UTM,
 * définitivement — les chiffres de sessions/commandes/CA saisis viennent d'un rapport UTM (manuel
 * ou API), jamais d'un autre modèle d'attribution.
 */
export async function consolidationCampagne(campagneId: string) {
  const lignesBudget = await db.select().from(budgetLignes).where(eq(budgetLignes.campagne_id, campagneId));
  const budgetReel = lignesBudget.reduce((s, l) => s + l.reel_dt, 0);
  const budgetEngage = lignesBudget.reduce((s, l) => s + l.engage_dt, 0);
  const budgetPrevu = lignesBudget.reduce((s, l) => s + l.prevu_dt, 0);

  const contenusPublies = (await db.select().from(contenus).where(eq(contenus.campagne_id, campagneId))).filter((c) => c.statut === "publie").length;

  const snapshots = await db.select().from(metriqueSnapshots).where(eq(metriqueSnapshots.campagne_id, campagneId));
  const reach = agregerKpi(snapshots, "reach");
  const sessions = agregerKpi(snapshots, "sessions");
  const commandes = agregerKpi(snapshots, "commandes");
  const ca = agregerKpi(snapshots, "ca_dt");
  const roas = ca.valeur !== null && budgetReel > 0 ? ca.valeur / budgetReel : null;

  return {
    budget: { prevu: budgetPrevu, engage: budgetEngage, reel: budgetReel, methode: "budget_lignes" },
    reach_cumule: reach,
    contenus_publies: { valeur: contenusPublies, methode: "compté (statut publié)" },
    sessions_attribuees: { ...sessions, methode: sessions.valeur !== null ? `${sessions.methode} (UTM dernier clic, RG-M2)` : sessions.methode },
    commandes_attribuees: { ...commandes, methode: commandes.valeur !== null ? `${commandes.methode} (UTM dernier clic, RG-M2)` : commandes.methode },
    ca_attribue: { ...ca, methode: ca.valeur !== null ? `${ca.methode} (UTM dernier clic, RG-M2)` : ca.methode },
    roas: { valeur: roas, methode: roas !== null ? "CA attribué / budget réel" : "aucune donnée" },
  };
}
