import { eq, inArray } from "drizzle-orm";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../db/client.js";
import { assets, contenus, lookItems, campagneArticles, budgetLignes, shootings, taches, looks } from "../db/schema.js";
import { env } from "../lib/env.js";

export interface UtilisationAsset {
  entite_type: string;
  entite_id: string;
  titre: string;
}

/** Fiche asset — navigation croisée « Utilisé dans » (§4.5) : parcourt tous les FK/tableaux possibles. */
export async function utiliseDans(assetId: string): Promise<UtilisationAsset[]> {
  const resultats: UtilisationAsset[] = [];

  const tousContenus = await db.select().from(contenus);
  for (const ct of tousContenus) {
    if (ct.asset_ids.includes(assetId)) resultats.push({ entite_type: "contenu", entite_id: ct.id, titre: ct.titre });
  }

  const items = await db.select().from(lookItems).where(eq(lookItems.photo_asset_id, assetId));
  for (const item of items) {
    const [look] = await db.select().from(looks).where(eq(looks.id, item.look_id)).limit(1);
    resultats.push({ entite_type: "look_item", entite_id: item.id, titre: look ? `Look ${look.nom}` : "Look" });
  }

  const refsCamp = await db.select().from(campagneArticles).where(eq(campagneArticles.photo_asset_id, assetId));
  for (const ref of refsCamp) resultats.push({ entite_type: "campagne_article", entite_id: ref.id, titre: ref.titre_extrait ?? "Référence campagne" });

  const lignesBudget = await db.select().from(budgetLignes).where(eq(budgetLignes.justificatif_asset_id, assetId));
  for (const ligne of lignesBudget) resultats.push({ entite_type: "budget_ligne", entite_id: ligne.id, titre: ligne.libelle });

  return resultats;
}

/** Fiche asset — « Vient de » : le shooting d'origine, s'il y en a un. */
export async function vientDe(assetId: string): Promise<UtilisationAsset | null> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset?.shooting_id) return null;
  const [tache] = await db.select().from(taches).where(eq(taches.id, asset.shooting_id)).limit(1);
  if (!tache) return null;
  return { entite_type: "shooting", entite_id: asset.shooting_id, titre: tache.titre };
}

export interface QuotasAssets {
  nombre_assets: number;
  taille_totale_octets: number;
  note: string;
}

/** Quotas affichés (§4.5) : mesure réelle du stockage local — pas de quota fabriqué (RG-PROV). */
export async function quotasAssets(): Promise<QuotasAssets> {
  const lignes = await db.select({ fichier_url: assets.fichier_url }).from(assets);
  let taille = 0;
  for (const { fichier_url } of lignes) {
    if (!fichier_url.startsWith("/uploads/")) continue; // référence externe : pas de fichier local
    try {
      const s = await stat(join(env.uploadsDir, fichier_url.slice("/uploads/".length)));
      taille += s.size;
    } catch {
      // fichier absent (rare, ex. artefact de test) — ignoré, pas de chiffre inventé
    }
  }
  return { nombre_assets: lignes.length, taille_totale_octets: taille, note: "Stockage local — aucun quota fixé (service abstrait, migration S3/R2 possible sans changement d'API)." };
}

export interface FiltresAssets {
  type?: string;
  tag?: string;
  campagne_id?: string;
  article_coloris_id?: string;
  createur_personne_id?: string;
  q?: string;
}

export async function listerAssets(filtres: FiltresAssets) {
  let lignes = await db.select().from(assets);
  if (filtres.type) lignes = lignes.filter((a) => a.type === filtres.type);
  if (filtres.tag) lignes = lignes.filter((a) => a.tags.includes(filtres.tag!));
  if (filtres.campagne_id) lignes = lignes.filter((a) => a.campagne_ids.includes(filtres.campagne_id!));
  if (filtres.article_coloris_id) lignes = lignes.filter((a) => a.article_coloris_ids.includes(filtres.article_coloris_id!));
  if (filtres.createur_personne_id) lignes = lignes.filter((a) => a.createur_personne_ids.includes(filtres.createur_personne_id!));
  if (filtres.q) {
    const q = filtres.q.toLowerCase();
    lignes = lignes.filter((a) => a.nom.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)));
  }
  return lignes.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Sélection multiple → tag/rattachement en masse (§4.5) : additif, jamais destructif. */
export async function tagMasse(ids: string[], ajout: { tags?: string[]; campagne_ids?: string[]; article_coloris_ids?: string[] }) {
  const lignes = await db.select().from(assets).where(inArray(assets.id, ids));
  const maj: any[] = [];
  for (const a of lignes) {
    const patch: Record<string, unknown> = {};
    if (ajout.tags?.length) patch.tags = [...new Set([...a.tags, ...ajout.tags])];
    if (ajout.campagne_ids?.length) patch.campagne_ids = [...new Set([...a.campagne_ids, ...ajout.campagne_ids])];
    if (ajout.article_coloris_ids?.length) patch.article_coloris_ids = [...new Set([...a.article_coloris_ids, ...ajout.article_coloris_ids])];
    if (Object.keys(patch).length === 0) continue;
    const [modifie] = (await db.update(assets).set(patch).where(eq(assets.id, a.id)).returning()) as any[];
    maj.push(modifie);
  }
  return maj;
}
