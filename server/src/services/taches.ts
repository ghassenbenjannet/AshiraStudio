import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { taches, shootings, looks, lookItems, poses, articleSkus } from "../db/schema.js";
import { calculerPretATourner, type PretATourner } from "@achirah/shared";
import { ErreurMetier } from "./catalogue.js";

/** RG-T3 : type shooting → enregistrement `shooting` 1-1 créé automatiquement. */
export async function creerTacheAvecCascade(donnees: typeof taches.$inferInsert) {
  const [tache] = (await db.insert(taches).values(donnees).returning()) as (typeof taches.$inferSelect)[];
  if (tache!.type === "shooting") {
    await db.insert(shootings).values({ tache_id: tache!.id });
  }
  return tache!;
}

/** RG-T3 : suppression d'une tâche shooting → cascade sur shooting/looks/look_items/poses. */
export async function supprimerTacheAvecCascade(tacheId: string) {
  const [tache] = await db.select().from(taches).where(eq(taches.id, tacheId)).limit(1);
  if (!tache) throw new ErreurMetier(404, "introuvable", "Tâche introuvable");
  if (tache.type === "shooting") {
    const lignesLooks = await db.select({ id: looks.id }).from(looks).where(eq(looks.shooting_id, tacheId));
    const idsLooks = lignesLooks.map((l) => l.id);
    if (idsLooks.length > 0) await db.delete(lookItems).where(inArray(lookItems.look_id, idsLooks));
    await db.delete(poses).where(eq(poses.shooting_id, tacheId));
    await db.delete(looks).where(eq(looks.shooting_id, tacheId));
    await db.delete(shootings).where(eq(shootings.tache_id, tacheId));
  }
  await db.delete(taches).where(eq(taches.id, tacheId));
}

/**
 * RG-LK1 : la liste des pièces à apporter s'agrège automatiquement (dédupliquée) depuis les
 * looks, fusionnée avec les ajouts manuels déjà stockés — calculée à la lecture, jamais
 * désynchronisée (une seule liste de vérité).
 * Limitation assumée (voir DECISIONS.md) : le look_item référence un coloris, pas une taille —
 * la taille "à apporter" par défaut est le premier SKU du coloris tant qu'aucune taille n'est
 * précisée en note du look_item (`Taille: XL`).
 */
export async function calculerPiecesEffectives(shootingId: string, piecesManuelles: { article_sku_id: string; note?: string }[]) {
  const lignesLooks = await db.select({ id: looks.id }).from(looks).where(eq(looks.shooting_id, shootingId));
  const idsLooks = lignesLooks.map((l) => l.id);
  const items = idsLooks.length ? await db.select().from(lookItems).where(inArray(lookItems.look_id, idsLooks)) : [];
  const colorisIds = Array.from(new Set(items.filter((i) => i.source === "catalogue" && i.article_coloris_id).map((i) => i.article_coloris_id!)));

  const autoDerivees: { article_sku_id: string; note?: string; origine: "look" }[] = [];
  if (colorisIds.length > 0) {
    const skus = await db.select().from(articleSkus).where(inArray(articleSkus.article_coloris_id, colorisIds));
    for (const colorisId of colorisIds) {
      const item = items.find((i) => i.article_coloris_id === colorisId);
      const tailleDemandee = item?.note?.match(/taille\s*:\s*(\S+)/i)?.[1];
      const skusDuColoris = skus.filter((s) => s.article_coloris_id === colorisId);
      const sku = (tailleDemandee && skusDuColoris.find((s) => s.taille.toLowerCase() === tailleDemandee.toLowerCase())) ?? skusDuColoris[0];
      if (sku) autoDerivees.push({ article_sku_id: sku.id, origine: "look" });
    }
  }

  // §CR-02 B : chaque pièce garde une trace de son origine (« issue des looks » vs ajoutée à la main)
  // pour un affichage honnête sur le call sheet — un ajout manuel sur le même SKU prime toujours.
  const fusion = new Map<string, { article_sku_id: string; note?: string; origine: "look" | "manuel" }>();
  autoDerivees.forEach((p) => fusion.set(p.article_sku_id, p));
  piecesManuelles.forEach((p) => fusion.set(p.article_sku_id, { ...p, origine: "manuel" }));
  return Array.from(fusion.values());
}

export async function pretATournerDeShooting(shootingId: string): Promise<PretATourner> {
  const [tache] = await db.select().from(taches).where(eq(taches.id, shootingId)).limit(1);
  const [shooting] = await db.select().from(shootings).where(eq(shootings.tache_id, shootingId)).limit(1);
  const nbPoses = (await db.select({ id: poses.id }).from(poses).where(eq(poses.shooting_id, shootingId))).length;
  const pieces = shooting ? await calculerPiecesEffectives(shootingId, shooting.pieces) : [];
  return calculerPretATourner({
    nbPieces: pieces.length,
    photographeId: shooting?.photographe_id ?? null,
    nbPoses,
    dateEcheance: tache?.date_echeance ?? null,
    lieu: tache?.lieu ?? null,
  });
}
