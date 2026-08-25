import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq, and, gte, asc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { conversations, messages, assets, actionsAgent, audits, agentsCampagne } from "../../db/schema.js";
import { env } from "../../lib/env.js";
import { genererTourConversation, messageUtilisateur, messageResultatsOutils, verifierBudgetJournalier, ErreurIaIndisponible, type ModelMessage, type ImageEntree } from "../../lib/ia/fournisseur.js";
import { construireSystemPrompt } from "./contexte.js";
import { trouverOutil, tousLesOutils, type ContexteOutil } from "./outils.js";
import { enregistrerAudit } from "../../lib/audit.js";

const ECRITURES_MAX_PAR_TOUR = 10; // RG-AGW4
const ECRITURES_MAX_PAR_JOUR = 100; // RG-AGW4
const TOURS_MAX_BOUCLE = 8; // garde-fou anti-boucle infinie d'outils
const MESSAGES_MAX_PAR_HEURE = 30; // §6.1

const MIME_PAR_EXTENSION: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function imageEnBase64(assetId: string): Promise<ImageEntree | null> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset || !asset.fichier_url.startsWith("/uploads/")) return null;
  const extension = asset.fichier_url.slice(asset.fichier_url.lastIndexOf("."));
  const mediaType = MIME_PAR_EXTENSION[extension];
  if (!mediaType) return null;
  try {
    const donnees = await readFile(join(env.uploadsDir, asset.fichier_url.slice("/uploads/".length)));
    return { base64: donnees.toString("base64"), mediaType };
  } catch {
    return null;
  }
}

async function verifierRateLimit(utilisateurId: string): Promise<void> {
  const ilYaUneHeure = new Date(Date.now() - 3600_000).toISOString();
  const conversationsUtilisateur = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.utilisateur_id, utilisateurId));
  const ids = conversationsUtilisateur.map((c) => c.id);
  if (ids.length === 0) return;
  const recents = (await db.select().from(messages).where(and(eq(messages.role, "user"), gte(messages.created_at, ilYaUneHeure)))).filter((m) => ids.includes(m.conversation_id));
  if (recents.length >= MESSAGES_MAX_PAR_HEURE) {
    throw new ErreurIaIndisponible(`Limite de ${MESSAGES_MAX_PAR_HEURE} messages/heure atteinte — réessayez plus tard.`);
  }
}

async function ecrituresAujourdhui(utilisateurId: string): Promise<number> {
  const debut = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const lignes = await db.select({ id: audits.id }).from(audits).where(and(eq(audits.utilisateur_id, utilisateurId), eq(audits.via_agent, true), gte(audits.at, debut)));
  return lignes.length;
}

async function messagesConversation(conversationId: string): Promise<ModelMessage[]> {
  const lignes = await db.select().from(messages).where(eq(messages.conversation_id, conversationId)).orderBy(asc(messages.created_at));
  const resultat: ModelMessage[] = [];
  for (const m of lignes) {
    if (m.role === "user") {
      const images: ImageEntree[] = [];
      for (const assetId of m.images) {
        const image = await imageEnBase64(assetId);
        if (image) images.push(image);
      }
      resultat.push(messageUtilisateur(m.contenu ?? "", images));
    } else {
      resultat.push({ role: "assistant", content: m.contenu || "(vide)" });
    }
  }
  return resultat;
}

export interface OptionsEnvoi {
  agentId?: string | null;
  campagneId?: string | null;
}

export interface ActionProposee {
  id: string;
  outil: string;
  entree: Record<string, unknown>;
  avant: unknown;
  apres_previsualise: unknown;
}

export interface ResultatTour {
  message: { id: string; contenu: string };
  actionsDirectes: { outil: string; entiteType: string; entiteId: string }[];
  actionsEnAttente: ActionProposee[];
  tokensUtilises: number;
}

/**
 * Boucle d'outils (§6.2-6.4) : compose le prompt, résout les outils lecture immédiatement,
 * exécute les outils directs, propose une carte de confirmation pour les outils sensibles —
 * rien n'est écrit avant confirmation humaine sur ces derniers.
 */
export async function envoyerMessage(conversationId: string, texteUtilisateur: string, imagesAssetIds: string[], ctx: ContexteOutil, options: OptionsEnvoi): Promise<ResultatTour> {
  await verifierRateLimit(ctx.utilisateurId);
  await verifierBudgetJournalier();

  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) throw new ErreurIaIndisponible("Conversation introuvable");

  await db.insert(messages).values({ conversation_id: conversationId, role: "user", contenu: texteUtilisateur, images: imagesAssetIds });

  // Titre auto (60 premiers caractères) à la première réponse.
  if (!conversation.titre) {
    await db.update(conversations).set({ titre: texteUtilisateur.slice(0, 60) }).where(eq(conversations.id, conversationId));
  }

  const agentIdEffectif = options.agentId ?? conversation.agent_id ?? null;
  let outilsActives: string[] = [];
  if (agentIdEffectif) {
    const [agent] = await db.select().from(agentsCampagne).where(eq(agentsCampagne.id, agentIdEffectif)).limit(1);
    outilsActives = agent?.outils_actives ?? [];
  }

  const systemPrompt = await construireSystemPrompt({ agentId: agentIdEffectif, campagneId: options.campagneId });
  const outilsDisponibles = tousLesOutils().filter((o) => outilsActives.length === 0 || outilsActives.includes(o.name));

  let historique = await messagesConversation(conversationId);
  let tokensTotal = 0;
  let ecrituresCeTour = 0;
  const actionsDirectes: ResultatTour["actionsDirectes"] = [];
  const actionsEnAttente: ActionProposee[] = [];
  let messageAssistantId = "";
  let texteFinal = "";

  for (let tour = 0; tour < TOURS_MAX_BOUCLE; tour++) {
    const reponse = await genererTourConversation({ system: systemPrompt, messages: historique, outils: outilsDisponibles, maxOutputTokens: 2048 });
    tokensTotal += reponse.tokens;
    texteFinal = reponse.texte;

    if (reponse.appelsOutils.length === 0) break;

    historique = [...historique, ...reponse.nouveauxMessages];
    const resultatsOutils: { id: string; nom: string; contenu: string; erreur?: boolean }[] = [];
    const groupeId = randomUUID();

    for (const appel of reponse.appelsOutils) {
      const outil = trouverOutil(appel.nom);
      if (!outil) {
        resultatsOutils.push({ id: appel.id, nom: appel.nom, contenu: "Outil inconnu.", erreur: true });
        continue;
      }
      try {
        if (outil.type === "lecture") {
          const resultat = await outil.executer(appel.entree, ctx);
          resultatsOutils.push({ id: appel.id, nom: appel.nom, contenu: JSON.stringify(resultat).slice(0, 8000) });
          continue;
        }

        // Outils d'écriture : gardes RG-AGW4 avant toute exécution/proposition.
        ecrituresCeTour++;
        if (ecrituresCeTour > ECRITURES_MAX_PAR_TOUR) {
          resultatsOutils.push({ id: appel.id, nom: appel.nom, contenu: `Limite de ${ECRITURES_MAX_PAR_TOUR} écritures par tour atteinte — arrête-toi ici et dis-le à l'utilisateur.`, erreur: true });
          continue;
        }
        const dejaAujourdhui = await ecrituresAujourdhui(ctx.utilisateurId);
        if (dejaAujourdhui + ecrituresCeTour > ECRITURES_MAX_PAR_JOUR) {
          resultatsOutils.push({ id: appel.id, nom: appel.nom, contenu: `Limite de ${ECRITURES_MAX_PAR_JOUR} écritures/jour atteinte pour cet utilisateur — arrête-toi et dis-le.`, erreur: true });
          continue;
        }

        if (outil.type === "direct") {
          const { entiteType, entiteId, resultat } = await outil.executer(appel.entree, ctx);
          await enregistrerAudit({ utilisateurId: ctx.utilisateurId, action: `agent.${outil.nom}`, entiteType, entiteId, apres: resultat as any, viaAgent: true, conversationId });
          actionsDirectes.push({ outil: outil.nom, entiteType, entiteId });
          resultatsOutils.push({ id: appel.id, nom: appel.nom, contenu: `Créé (⚡ agent) : ${JSON.stringify(resultat).slice(0, 2000)}` });
        } else {
          const { avant, apres } = await outil.previsualiser(appel.entree, ctx);
          const [action] = (await db
            .insert(actionsAgent)
            .values({ conversation_id: conversationId, message_id: "", groupe_id: groupeId, outil: outil.nom, entree: appel.entree, avant: avant as any, apres_previsualise: apres as any, utilisateur_id: ctx.utilisateurId })
            .returning()) as any[];
          actionsEnAttente.push({ id: action.id, outil: outil.nom, entree: appel.entree, avant, apres_previsualise: apres });
          resultatsOutils.push({ id: appel.id, nom: appel.nom, contenu: "Proposition enregistrée, en attente de confirmation de l'utilisateur (carte de confirmation affichée)." });
        }
      } catch (err) {
        resultatsOutils.push({ id: appel.id, nom: appel.nom, contenu: err instanceof Error ? err.message : "Erreur outil", erreur: true });
      }
    }

    historique = [...historique, messageResultatsOutils(resultatsOutils)];
  }

  const [messageAssistant] = (await db.insert(messages).values({ conversation_id: conversationId, role: "assistant", contenu: texteFinal, tokens: tokensTotal }).returning()) as any[];
  messageAssistantId = messageAssistant.id;
  for (const action of actionsEnAttente) {
    await db.update(actionsAgent).set({ message_id: messageAssistantId }).where(eq(actionsAgent.id, action.id));
  }
  await db.update(conversations).set({ updated_at: new Date().toISOString() }).where(eq(conversations.id, conversationId));

  return { message: { id: messageAssistantId, contenu: texteFinal }, actionsDirectes, actionsEnAttente, tokensUtilises: tokensTotal };
}

/** Bac à sable « Tester » (RG-AGC2) : aucun outil d'écriture, rien n'est persisté. */
export async function testerAgent(agentId: string, texteUtilisateur: string, ctx: ContexteOutil): Promise<{ contenu: string }> {
  await verifierRateLimit(ctx.utilisateurId);
  await verifierBudgetJournalier();

  const [agent] = await db.select().from(agentsCampagne).where(eq(agentsCampagne.id, agentId)).limit(1);
  if (!agent) throw new ErreurIaIndisponible("Agent introuvable");

  const systemPrompt = await construireSystemPrompt({ agentId, campagneId: agent.campagne_id });
  const outilsLectureSeule = tousLesOutils().filter((o) => trouverOutil(o.name)?.type === "lecture");

  let historique: ModelMessage[] = [messageUtilisateur(texteUtilisateur)];
  let texteFinal = "";
  for (let tour = 0; tour < TOURS_MAX_BOUCLE; tour++) {
    const reponse = await genererTourConversation({ system: systemPrompt, messages: historique, outils: outilsLectureSeule, maxOutputTokens: 2048 });
    texteFinal = reponse.texte;
    if (reponse.appelsOutils.length === 0) break;
    historique = [...historique, ...reponse.nouveauxMessages];
    const resultats: { id: string; nom: string; contenu: string; erreur?: boolean }[] = [];
    for (const appel of reponse.appelsOutils) {
      const outil = trouverOutil(appel.nom);
      if (!outil || outil.type !== "lecture") {
        resultats.push({ id: appel.id, nom: appel.nom, contenu: "Outil d'écriture désactivé en mode test (RG-AGC2).", erreur: true });
        continue;
      }
      try {
        const resultat = await outil.executer(appel.entree, ctx);
        resultats.push({ id: appel.id, nom: appel.nom, contenu: JSON.stringify(resultat).slice(0, 8000) });
      } catch (err) {
        resultats.push({ id: appel.id, nom: appel.nom, contenu: err instanceof Error ? err.message : "Erreur outil", erreur: true });
      }
    }
    historique = [...historique, messageResultatsOutils(resultats)];
  }
  return { contenu: texteFinal };
}

/** Confirmation d'une carte d'action (§6.4) : exécute réellement l'outil, jamais avant ce moment. */
export async function confirmerAction(actionId: string, ctx: ContexteOutil, entreeAjustee?: Record<string, unknown>): Promise<{ resultat: unknown }> {
  const [action] = await db.select().from(actionsAgent).where(eq(actionsAgent.id, actionId)).limit(1);
  if (!action) throw new ErreurIaIndisponible("Action introuvable");
  if (action.statut !== "en_attente") throw new ErreurIaIndisponible("Cette action a déjà été traitée.");
  const outil = trouverOutil(action.outil);
  if (!outil || outil.type !== "confirmation") throw new ErreurIaIndisponible("Outil de confirmation introuvable.");

  const entree = entreeAjustee ?? action.entree;
  const { entiteType, entiteId, resultat } = await outil.executer(entree, ctx);
  await enregistrerAudit({ utilisateurId: ctx.utilisateurId, action: `agent.${outil.nom}`, entiteType, entiteId, avant: action.avant as any, apres: resultat as any, viaAgent: true, conversationId: action.conversation_id });
  await db.update(actionsAgent).set({ statut: "confirmee" }).where(eq(actionsAgent.id, actionId));
  return { resultat };
}

export async function annulerAction(actionId: string): Promise<void> {
  await db.update(actionsAgent).set({ statut: "annulee" }).where(eq(actionsAgent.id, actionId));
}

/**
 * Q&A libre (§6.5, barre « Demander » du cockpit) : lecture seule, sans agent ni persistance —
 * une question rapide n'ouvre pas une conversation Studio à part entière.
 */
export async function poserQuestion(question: string, ctx: ContexteOutil, campagneId?: string | null): Promise<{ contenu: string }> {
  await verifierRateLimit(ctx.utilisateurId);
  await verifierBudgetJournalier();

  const systemPrompt = await construireSystemPrompt({ campagneId });
  const outilsLectureSeule = tousLesOutils().filter((o) => trouverOutil(o.name)?.type === "lecture");

  let historique: ModelMessage[] = [messageUtilisateur(question)];
  let texteFinal = "";
  for (let tour = 0; tour < TOURS_MAX_BOUCLE; tour++) {
    const reponse = await genererTourConversation({ system: systemPrompt, messages: historique, outils: outilsLectureSeule, maxOutputTokens: 1500 });
    texteFinal = reponse.texte;
    if (reponse.appelsOutils.length === 0) break;
    historique = [...historique, ...reponse.nouveauxMessages];
    const resultats: { id: string; nom: string; contenu: string; erreur?: boolean }[] = [];
    for (const appel of reponse.appelsOutils) {
      const outil = trouverOutil(appel.nom);
      if (!outil || outil.type !== "lecture") {
        resultats.push({ id: appel.id, nom: appel.nom, contenu: "Outil indisponible dans ce contexte.", erreur: true });
        continue;
      }
      try {
        const resultat = await outil.executer(appel.entree, ctx);
        resultats.push({ id: appel.id, nom: appel.nom, contenu: JSON.stringify(resultat).slice(0, 8000) });
      } catch (err) {
        resultats.push({ id: appel.id, nom: appel.nom, contenu: err instanceof Error ? err.message : "Erreur outil", erreur: true });
      }
    }
    historique = [...historique, messageResultatsOutils(resultats)];
  }
  return { contenu: texteFinal };
}
