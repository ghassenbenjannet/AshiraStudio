import { eq, inArray } from "drizzle-orm";
import { DIMENSIONS_GATE, type ScoreDetailDimension } from "@achirah/shared";
import { db } from "../../db/client.js";
import { contenus, articles, articleColoris, gammes, taches, shootings, looks, lookItems, poses, articleSkus, coloris, assets, briefQuotidienCache } from "../../db/schema.js";
import { genererObjet, verifierBudgetJournalier, ErreurIaIndisponible, type ImageEntree } from "../../lib/ia/fournisseur.js";
import { construireSystemPrompt, lireConfig } from "./contexte.js";
import { enregistrerAudit } from "../../lib/audit.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../../lib/env.js";

// ───────────────────────── §6.6 — Gate de marque ─────────────────────────

const SCHEMA_NOTATION = {
  type: "object",
  properties: {
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dimension: { type: "string", enum: DIMENSIONS_GATE as unknown as string[] },
          score: { type: "number", enum: [0, 1, 2] },
          raison: { type: "string" },
          correction: { type: "string" },
        },
        required: ["dimension", "score", "raison"],
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ["dimensions"],
};

export async function noterContenu(contenuId: string, utilisateurId: string): Promise<{ score_marque: number; score_detail: ScoreDetailDimension[] }> {
  await verifierBudgetJournalier();
  const [contenu] = await db.select().from(contenus).where(eq(contenus.id, contenuId)).limit(1);
  if (!contenu) throw new ErreurIaIndisponible("Contenu introuvable");

  let gammesLiees: string[] = [];
  if (contenu.article_coloris_ids.length > 0) {
    const lignes = await db
      .select({ nom: gammes.nom })
      .from(articleColoris)
      .innerJoin(articles, eq(articleColoris.article_id, articles.id))
      .innerJoin(gammes, eq(articles.gamme_id, gammes.id))
      .where(inArray(articleColoris.id, contenu.article_coloris_ids));
    gammesLiees = [...new Set(lignes.map((l) => l.nom))];
  }

  const system = `${lireConfig("gate-notation.md")}\n\n---\n\n${await construireSystemPrompt({ campagneId: contenu.campagne_id })}`;
  const messageUtilisateur = [
    `Type : ${contenu.type}`,
    `Gamme(s) concernée(s) : ${gammesLiees.length ? gammesLiees.join(", ") : "non déterminable (aucun article lié)"}`,
    `Légende à noter :\n${contenu.caption || "(vide)"}`,
  ].join("\n");

  const { donnees, tokens } = await genererObjet<{ dimensions: ScoreDetailDimension[] }>({ system, message: messageUtilisateur, schema: SCHEMA_NOTATION, maxOutputTokens: 700 });
  const scoreTotal = donnees.dimensions.reduce((s, d) => s + d.score, 0);

  const [modifie] = (await db.update(contenus).set({ score_marque: scoreTotal, score_detail: donnees.dimensions }).where(eq(contenus.id, contenuId)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.noter_gate", entiteType: "contenu", entiteId: contenuId, apres: { score_marque: scoreTotal }, viaAgent: true });
  void tokens; // consommé en dépenses IA quotidiennes — non attaché à un message de conversation
  return { score_marque: modifie.score_marque, score_detail: modifie.score_detail };
}

// ───────────────────────── §4.4 — Brief de shooting ─────────────────────────

const SCHEMA_BRIEF_SHOOTING = {
  type: "object",
  properties: {
    plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ordre: { type: "number" },
          pieces: { type: "array", items: { type: "string" } },
          modele: { type: "string" },
          mise_en_scene: { type: "string" },
        },
        required: ["ordre", "pieces", "mise_en_scene"],
      },
    },
    materiel_note: { type: "string" },
    points_attention: { type: "string" },
  },
  required: ["plans", "materiel_note"],
};

export interface BriefShooting {
  plans: { ordre: number; pieces: string[]; modele?: string; mise_en_scene: string }[];
  materiel_note: string;
  points_attention?: string;
}

async function labelSku(skuId: string): Promise<string> {
  const [sku] = await db.select().from(articleSkus).where(eq(articleSkus.id, skuId)).limit(1);
  if (!sku) return "SKU inconnu";
  const [ac] = await db.select().from(articleColoris).where(eq(articleColoris.id, sku.article_coloris_id)).limit(1);
  const [article] = ac ? await db.select().from(articles).where(eq(articles.id, ac.article_id)) : [];
  const [col] = ac ? await db.select().from(coloris).where(eq(coloris.id, ac.coloris_id)) : [];
  return `${article?.reference ?? "?"} — ${article?.nom ?? "?"} (${col?.nom_commercial ?? "?"}) — ${sku.taille}`;
}

export async function genererBriefShooting(shootingId: string): Promise<BriefShooting> {
  await verifierBudgetJournalier();
  const [tache] = await db.select().from(taches).where(eq(taches.id, shootingId)).limit(1);
  if (!tache || tache.type !== "shooting") throw new ErreurIaIndisponible("Shooting introuvable");
  const [shooting] = await db.select().from(shootings).where(eq(shootings.tache_id, shootingId)).limit(1);
  const lignesLooks = await db.select().from(looks).where(eq(looks.shooting_id, shootingId));
  const idsLooks = lignesLooks.map((l) => l.id);
  const items = idsLooks.length ? await db.select().from(lookItems).where(inArray(lookItems.look_id, idsLooks)) : [];
  const posesListe = await db.select().from(poses).where(eq(poses.shooting_id, shootingId)).orderBy(poses.ordre);

  const piecesLabels: string[] = [];
  for (const p of shooting?.pieces ?? []) piecesLabels.push(await labelSku(p.article_sku_id));

  const images: ImageEntree[] = [];
  const photosItems = items.filter((i) => i.source === "photo" && i.photo_asset_id);
  for (const it of photosItems.slice(0, 4)) {
    const [asset] = await db.select().from(assets).where(eq(assets.id, it.photo_asset_id!)).limit(1);
    if (!asset || !asset.fichier_url.startsWith("/uploads/")) continue;
    const ext = asset.fichier_url.slice(asset.fichier_url.lastIndexOf("."));
    const mediaType = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext] as ImageEntree["mediaType"] | undefined;
    if (!mediaType) continue;
    try {
      const fichier = await readFile(join(env.uploadsDir, asset.fichier_url.slice("/uploads/".length)));
      images.push({ base64: fichier.toString("base64"), mediaType });
    } catch {
      // fichier absent — ignoré, pas de blocage
    }
  }

  const contexteTexte = [
    `Tâche : ${tache.titre}, date ${tache.date_echeance}, lieu ${tache.lieu ?? "non renseigné"}.`,
    `Heure lumière : ${shooting?.heure_lumiere ?? "non renseignée"}. Durée prévue : ${shooting?.duree_min ?? "?"} min.`,
    `Looks (${lignesLooks.length}) :`,
    ...lignesLooks.map((look) => {
      const itemsDuLook = items.filter((i) => i.look_id === look.id);
      return `- ${look.nom} : ${itemsDuLook.map((i) => `[${i.slot}] ${i.source === "texte" ? i.texte : i.source === "photo" ? "(voir photo jointe)" : i.article_coloris_id}`).join(", ") || "(vide)"}`;
    }),
    `Shot list (${posesListe.length} poses) : ${posesListe.map((p) => `${p.ordre + 1}. ${p.description}`).join(" | ") || "(vide)"}`,
    `Pièces à apporter (références exactes) : ${piecesLabels.join(", ") || "(aucune)"}`,
  ].join("\n");

  const system = `${lireConfig("brief-shooting.md")}\n\n---\n\n${await construireSystemPrompt({ campagneId: tache.campagne_id })}`;
  const { donnees } = await genererObjet<BriefShooting>({ system, message: { texte: contexteTexte, images }, schema: SCHEMA_BRIEF_SHOOTING, maxOutputTokens: 1500 });
  return donnees;
}

// ───────────────────────── §4.5 — Générateur d'idées scorées ─────────────────────────

const SCHEMA_IDEES = {
  type: "object",
  properties: {
    idees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          hook: { type: "string" },
          storyboard: { type: "string" },
          plans_a_filmer: { type: "array", items: { type: "string" } },
          duree: { type: "string" },
          caption: { type: "string" },
          son: { type: "string" },
          lieu: { type: "string" },
          pieces: { type: "array", items: { type: "string" } },
          score: { type: "number" },
          score_justification: { type: "string" },
        },
        required: ["hook", "storyboard", "plans_a_filmer", "duree", "caption", "pieces", "score", "score_justification"],
      },
    },
  },
  required: ["idees"],
};

export interface IdeeGeneree {
  hook: string;
  storyboard: string;
  plans_a_filmer: string[];
  duree: string;
  caption: string;
  son?: string;
  lieu?: string;
  pieces: string[];
  score: number;
  score_justification: string;
}

export async function genererIdees(entree: { objectif: string; plateformes: string[]; articles?: string[]; effort: string; quantite: number; campagne_id?: string }): Promise<IdeeGeneree[]> {
  await verifierBudgetJournalier();
  const system = await construireSystemPrompt({ campagneId: entree.campagne_id ?? null });
  const message = [
    `Génère ${entree.quantite} idées de contenu tournables sur mesure.`,
    `Objectif : ${entree.objectif}.`,
    `Effort de production : ${entree.effort} (facile = tournable au téléphone en 20 min).`,
    entree.articles?.length ? `Articles à mettre en avant (references catalogue) : ${entree.articles.join(", ")}.` : "Aucun article imposé — choisis dans le catalogue réel fourni en contexte.",
    "Le score est une estimation qualitative de ton cru, jamais une prédiction (RG-ID1) — dis-le dans la justification si utile.",
    "Au moins la moitié des idées doivent être tournables au téléphone en 20 minutes.",
  ].join("\n");
  const { donnees } = await genererObjet<{ idees: IdeeGeneree[] }>({ system, message, schema: SCHEMA_IDEES, maxOutputTokens: 3000 });
  return donnees.idees;
}

// ───────────────────────── §6.5 — Brief quotidien (cache journalier en mémoire, mono-processus) ─────────────────────────

const SCHEMA_BRIEF_QUOTIDIEN = {
  type: "object",
  properties: {
    constats: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    actions: {
      type: "array",
      items: { type: "object", properties: { titre: { type: "string" }, description: { type: "string" } }, required: ["titre", "description"] },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["constats", "actions"],
};

export interface BriefQuotidien {
  date: string;
  constats: string[];
  actions: { titre: string; description: string }[];
}

/**
 * CDC v4, Lot 3.4 — externalisé de la mémoire du processus vers `brief_quotidien_cache` (une ligne
 * par organisation, Lot 3.2) : une variable de module partagerait le même brief entre toutes les
 * organisations d'un même processus, et redeviendrait vide à chaque redémarrage — deux défauts que
 * le prompt demande explicitement de corriger.
 */
export async function briefQuotidien(organisationId: string, force = false): Promise<BriefQuotidien> {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (!force) {
    const [ligne] = await db.select().from(briefQuotidienCache).where(eq(briefQuotidienCache.organisation_id, organisationId)).limit(1);
    if (ligne && ligne.date === aujourdhui) return { date: ligne.date, ...ligne.donnees };
  }

  await verifierBudgetJournalier();
  const system = await construireSystemPrompt({});
  const message = "Génère le brief du jour : 3 à 5 constats factuels (chacun citant sa provenance et sa fraîcheur, ⚠︎ si >48h) et exactement 3 actions recommandées, à partir du contexte fourni (tâches, campagne active, catalogue). Ne cite que des faits présents dans le contexte — une donnée absente se dit manquante (RG-BR1/BR2), jamais inventée.";
  const { donnees } = await genererObjet<{ constats: string[]; actions: { titre: string; description: string }[] }>({ system, message, schema: SCHEMA_BRIEF_QUOTIDIEN, maxOutputTokens: 900 });

  await db
    .insert(briefQuotidienCache)
    .values({ organisation_id: organisationId, date: aujourdhui, donnees })
    .onConflictDoUpdate({ target: briefQuotidienCache.organisation_id, set: { date: aujourdhui, donnees } });

  return { date: aujourdhui, ...donnees };
}
