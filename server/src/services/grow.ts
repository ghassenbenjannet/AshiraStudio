import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { recommandations, taches, ambassadeurs, articleColoris, assets, contenus } from "../db/schema.js";
import type { TypeRecommandation, ImpactRecommandation } from "@achirah/shared";
import { detteDeMesure } from "./campagnes.js";

interface Candidat {
  type: TypeRecommandation;
  titre: string;
  justification: string;
  source_donnees: { libelle: string; valeur: string; date: string }[];
  impact: ImpactRecommandation;
}

const POIDS_IMPACT: Record<ImpactRecommandation, number> = { haut: 3, moyen: 2, bas: 1 };
const aujourdhui = () => new Date().toISOString().slice(0, 10);

async function regleRetards(): Promise<Candidat | null> {
  const toutes = await db.select().from(taches);
  const auj = aujourdhui();
  const enRetard = toutes.filter((t) => t.statut !== "fait" && t.date_echeance < auj);
  if (enRetard.length === 0) return null;
  return {
    type: "operationnel",
    titre: `${enRetard.length} tâche(s) en retard`,
    justification: "Des tâches ont dépassé leur échéance sans être marquées faites — un rattrapage rapide évite l'effet boule de neige avant le prochain jalon.",
    source_donnees: [{ libelle: "Tâches en retard", valeur: String(enRetard.length), date: auj }],
    impact: enRetard.length >= 5 ? "haut" : enRetard.length >= 2 ? "moyen" : "bas",
  };
}

async function regleAmbassadeursInactifs(): Promise<Candidat | null> {
  const tous = await db.select().from(ambassadeurs).where(eq(ambassadeurs.statut, "actif"));
  const seuil = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const inactifs = tous.filter((a) => a.posts.every((p) => p.date < seuil));
  if (inactifs.length === 0) return null;
  return {
    type: "createur",
    titre: `${inactifs.length} ambassadeur(s) sans post depuis 30 j`,
    justification: "Des ambassadeurs actifs n'ont publié aucun post recensé depuis 30 jours — une relance personnalisée maintient l'engagement du réseau.",
    source_donnees: [{ libelle: "Ambassadeurs inactifs (30 j)", valeur: String(inactifs.length), date: aujourdhui() }],
    impact: inactifs.length >= 5 ? "haut" : "moyen",
  };
}

async function regleArticlesSansAsset(): Promise<Candidat | null> {
  const coloris = await db.select().from(articleColoris).where(eq(articleColoris.statut, "actif"));
  const tousAssets = await db.select({ article_coloris_ids: assets.article_coloris_ids }).from(assets);
  const idsAvecAsset = new Set(tousAssets.flatMap((a) => a.article_coloris_ids));
  const sansAsset = coloris.filter((c) => !idsAvecAsset.has(c.id) && (c.photos?.length ?? 0) === 0);
  if (sansAsset.length === 0) return null;
  return {
    type: "boost_creatif",
    titre: `${sansAsset.length} coloris actif(s) sans visuel`,
    justification: "Des coloris actifs du catalogue n'ont ni photo ni asset rattaché — impossible de les mettre en avant en contenu sans visuel.",
    source_donnees: [{ libelle: "Coloris sans visuel", valeur: String(sansAsset.length), date: aujourdhui() }],
    impact: "moyen",
  };
}

async function regleDetteDeMesure(): Promise<Candidat | null> {
  const dette = await detteDeMesure();
  if (dette.length === 0) return null;
  return {
    type: "operationnel",
    titre: `${dette.length} campagne(s) livrée(s) non fermée(s) depuis 21 j+`,
    justification: "Ces campagnes attendent leur rapport de fermeture depuis plus de 3 semaines — les leçons associées ne sont pas encore capitalisées pour le prochain chapitre.",
    source_donnees: dette.map((d) => ({ libelle: d.nom, valeur: d.statut, date: d.updated_at.slice(0, 10) })),
    impact: "haut",
  };
}

async function regleContenusNonDeclines(): Promise<Candidat | null> {
  const publies = await db.select().from(contenus).where(eq(contenus.statut, "publie"));
  const nonDeclines = publies.filter((c) => c.plateformes.length <= 1);
  if (nonDeclines.length === 0) return null;
  return {
    type: "opportunite_contenu",
    titre: `${nonDeclines.length} contenu(s) publié(s) sur une seule plateforme`,
    justification: "Ces contenus publiés n'ont été déclinés sur aucune autre plateforme — une déclinaison rapide (1 tap) maximise leur portée sans nouveau tournage.",
    source_donnees: nonDeclines.slice(0, 5).map((c) => ({ libelle: c.titre, valeur: `${c.plateformes.length} plateforme(s)`, date: (c.publie_le ?? c.updated_at).slice(0, 10) })),
    impact: "bas",
  };
}

/** §4.7 — RG-G2 : entièrement basé sur les données internes, aucune IA requise, jamais d'écran mort. */
export async function genererRecommandations(): Promise<typeof recommandations.$inferSelect[]> {
  const actives = await db.select().from(recommandations).where(eq(recommandations.statut, "nouvelle"));
  const clesExistantes = new Set(actives.map((r) => `${r.type}|${r.titre}`));

  const candidats = (await Promise.all([regleRetards(), regleAmbassadeursInactifs(), regleArticlesSansAsset(), regleDetteDeMesure(), regleContenusNonDeclines()])).filter(
    (c): c is Candidat => c !== null && !clesExistantes.has(`${c.type}|${c.titre}`),
  );
  candidats.sort((a, b) => POIDS_IMPACT[b.impact] - POIDS_IMPACT[a.impact]);

  const placesRestantes = Math.max(0, 5 - actives.length);
  const aInserer = candidats.slice(0, placesRestantes);
  if (aInserer.length > 0) {
    await db.insert(recommandations).values(aInserer.map((c) => ({ ...c, statut: "nouvelle" as const })));
  }
  return db.select().from(recommandations).where(eq(recommandations.statut, "nouvelle"));
}
