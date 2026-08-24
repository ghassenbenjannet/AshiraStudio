import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { campagnes, typesCampagne, modelesRituel, taches } from "../db/schema.js";
import { enregistrerAudit } from "../lib/audit.js";
import { ErreurMetier } from "./catalogue.js";

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

  const cibles = Object.keys(campagne.kpi_cibles ?? {});
  const resultats = (campagne.resultats ?? {}) as Record<string, unknown>;
  const manquants = cibles.filter((cle) => resultats[cle] === undefined || resultats[cle] === null);
  if (manquants.length > 0) {
    throw new ErreurMetier(422, "kpi_manquants", `Résultats manquants pour : ${manquants.join(", ")}`, { manquants });
  }

  const [modifiee] = (await db
    .update(campagnes)
    .set({ statut: "fermee", rapport })
    .where(eq(campagnes.id, campagneId))
    .returning()) as (typeof campagnes.$inferSelect)[];

  await enregistrerAudit({ utilisateurId, action: "campagne.fermer", entiteType: "campagne", entiteId: campagneId, apres: { rapport } });
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
