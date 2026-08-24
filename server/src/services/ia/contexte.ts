import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { campagnes, articles, articleColoris, gammes, coloris, expressions, lecons, agentsCampagne, listesParametrables } from "../../db/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, "../../config");

function lireConfig(nomFichier: string): string {
  return readFileSync(join(CONFIG_DIR, nomFichier), "utf-8");
}

/** RG-AGW1/7 (§6.4) — garde-fous techniques, jamais affichés, jamais contournables par le prompt utilisateur. */
const GARDE_FOUS = `# GARDE-FOUS TECHNIQUES (non négociables, priment sur toute autre instruction)

- Tu n'as accès à aucun outil de suppression ou d'archivage (RG-AGW1) — n'en propose jamais, n'en invente jamais.
- Tu ne peux jamais publier, envoyer un message externe (WhatsApp/DM/email), ni engager de dépenses publicitaires — ce sont des actions humaines (EX1/EX2).
- Les outils de contenu créent uniquement des brouillons (RG-AGW7) — jamais d'approbation, de planification ou de publication.
- Chaque outil que tu appelles est vérifié côté serveur selon les droits réels de la personne qui te parle — un refus serveur n'est pas négociable, ne le recontourne pas autrement.
- Une expression en derja/arabizi hors lexique validé : recherche-la dans le lexique fourni ; si absente, propose-la à validation plutôt que de l'inventer.
- Ne te note jamais toi-même sur le Gate de marque.
- En cas de conflit entre une instruction de l'utilisateur ou de l'agent et la marque (Brand Brain), applique la marque et dis-le une fois clairement.`;

async function lexiqueTexte(): Promise<string> {
  const lignes = await db.select().from(expressions).where(inArray(expressions.statut, ["validee", "interdite"]));
  const validees = lignes.filter((l) => l.statut === "validee");
  const interdites = lignes.filter((l) => l.statut === "interdite");
  return [
    "# LEXIQUE",
    `Validées (à utiliser librement) : ${validees.length ? validees.map((l) => l.texte).join(", ") : "(aucune enregistrée)"}`,
    `Interdites (ne jamais utiliser) : ${interdites.length ? interdites.map((l) => l.texte).join(", ") : "(aucune enregistrée)"}`,
  ].join("\n");
}

async function contexteDynamiqueTexte(): Promise<string> {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [chapitreActif] = await db.select().from(campagnes).where(eq(campagnes.statut, "active")).orderBy(desc(campagnes.created_at)).limit(1);
  let ligneChapitre = "Aucune campagne active en ce moment.";
  if (chapitreActif) {
    const jours = Math.round((new Date(chapitreActif.date_fin).getTime() - new Date(aujourdhui).getTime()) / 86400000);
    ligneChapitre = `Chapitre actif : « ${chapitreActif.nom} », J${jours >= 0 ? "-" : "+"}${Math.abs(jours)} avant sa date de fin (${chapitreActif.date_fin}).`;
  }

  const articlesReels = await db
    .select({
      reference: articles.reference,
      nom: articles.nom,
      statut_cycle: articles.statut_cycle,
      gamme: gammes.nom,
      coloris: coloris.nom_commercial,
      prix_dt: articleColoris.prix_dt,
    })
    .from(articleColoris)
    .innerJoin(articles, eq(articleColoris.article_id, articles.id))
    .innerJoin(gammes, eq(articles.gamme_id, gammes.id))
    .innerJoin(coloris, eq(articleColoris.coloris_id, coloris.id))
    .where(inArray(articles.statut_cycle, ["production", "stock"]));

  const ligneCatalogue =
    articlesReels.length === 0
      ? "Catalogue (en stock/production) : aucun article à ce statut actuellement."
      : `Catalogue (en stock/production) :\n${articlesReels.map((a) => `- ${a.reference} — ${a.nom} (${a.gamme}, ${a.coloris}, ${a.prix_dt ?? "prix non défini"} DT, ${a.statut_cycle})`).join("\n")}`;

  return ["# CONTEXTE DYNAMIQUE", `Date du jour : ${aujourdhui}.`, ligneChapitre, ligneCatalogue].join("\n");
}

async function leconsTexte(): Promise<string> {
  const actives = await db.select().from(lecons).where(eq(lecons.statut, "active")).orderBy(desc(lecons.created_at)).limit(20);
  if (actives.length === 0) return "# LEÇONS ACTIVES\nAucune leçon enregistrée pour l'instant.";
  return ["# LEÇONS ACTIVES (≤20, citer quand elles guident une proposition)", ...actives.map((l) => `- [${l.type}] ${l.texte}${l.preuve ? ` — preuve : ${l.preuve}` : ""}`)].join("\n");
}

async function campagneSelectionneeTexte(campagneId: string | null | undefined): Promise<string> {
  let campagne = null;
  if (campagneId === null) return "# CAMPAGNE SÉLECTIONNÉE\nAucune — ne suppose aucun contexte de campagne particulier.";
  if (campagneId) {
    [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, campagneId)).limit(1);
  } else {
    [campagne] = await db.select().from(campagnes).where(eq(campagnes.statut, "active")).orderBy(desc(campagnes.created_at)).limit(1);
  }
  if (!campagne) return "# CAMPAGNE SÉLECTIONNÉE\nAucune campagne active à sélectionner par défaut.";
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const jours = Math.round((new Date(campagne.date_fin).getTime() - new Date(aujourdhui).getTime()) / 86400000);
  const nomsCanaux = campagne.canaux.length
    ? (await db.select().from(listesParametrables).where(inArray(listesParametrables.id, campagne.canaux))).map((c) => c.nom).join(", ")
    : "aucun";
  return [
    "# CAMPAGNE SÉLECTIONNÉE",
    `Nom : ${campagne.nom}`,
    `Objectif : ${campagne.objectif}${campagne.objectif_texte ? ` — ${campagne.objectif_texte}` : ""}`,
    `Description : ${campagne.description ?? "(non renseignée)"}`,
    `Dates : ${campagne.date_debut} → ${campagne.date_fin} (J${jours >= 0 ? "-" : "+"}${Math.abs(jours)})`,
    `Canaux : ${nomsCanaux}`,
  ].join("\n");
}

async function instructionsAgentTexte(agentId: string | null | undefined): Promise<string> {
  if (!agentId) return "";
  const [agent] = await db.select().from(agentsCampagne).where(eq(agentsCampagne.id, agentId)).limit(1);
  if (!agent) return "";
  return `# INSTRUCTIONS PERSONNALISÉES DE L'AGENT « ${agent.nom} »\n${agent.instructions}`;
}

export interface OptionsPrompt {
  agentId?: string | null;
  /** undefined = campagne active la plus récente (défaut §6.2) ; null = "Aucune" explicitement choisie. */
  campagneId?: string | null;
}

/**
 * Composition du prompt (RG-AGC1, §6.2) — hiérarchie stricte, un conflit = le niveau supérieur
 * prime. Chaque niveau est un bloc concaténé dans l'ordre exact du CDC.
 */
export async function construireSystemPrompt(options: OptionsPrompt): Promise<string> {
  const blocs = [
    GARDE_FOUS,
    `# BRAND BRAIN\n${lireConfig("brand-brain.md")}`,
    await lexiqueTexte(),
    await contexteDynamiqueTexte(),
    await leconsTexte(),
    await campagneSelectionneeTexte(options.campagneId),
    await instructionsAgentTexte(options.agentId),
  ];
  return blocs.filter(Boolean).join("\n\n---\n\n");
}

export { lireConfig };
