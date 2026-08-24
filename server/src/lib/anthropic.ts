import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";
import { db } from "../db/client.js";
import { messages } from "../db/schema.js";
import { gte } from "drizzle-orm";

/** Modèle unique de l'app (§6.1) — jamais choisi par l'utilisateur. */
export const MODELE_IA = "claude-sonnet-4-6";

export class ErreurIaIndisponible extends Error {
  constructor(raison: string) {
    super(raison);
  }
}

let client: Anthropic | null = null;

/**
 * Client Anthropic paresseux — jamais instancié si la clé est absente. Scénario recette 6
 * (« Panne IA ») : clé coupée → Studio/agents/gate/brief refusent proprement, tout le reste
 * (écritures manuelles incluses) continue à fonctionner à 100 % (RG-PAR1d).
 */
export function clientAnthropic(): Anthropic {
  if (!env.anthropicApiKey) {
    throw new ErreurIaIndisponible("IA indisponible : ANTHROPIC_API_KEY non configurée côté serveur.");
  }
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Budget tokens/jour (§6.1) : somme réelle des tokens consommés aujourd'hui (messages assistant). */
export async function tokensConsommesAujourdhui(): Promise<number> {
  const debut = `${aujourdhuiIso()}T00:00:00.000Z`;
  const lignes = await db.select({ tokens: messages.tokens }).from(messages).where(gte(messages.created_at, debut));
  return lignes.reduce((somme, l) => somme + (l.tokens ?? 0), 0);
}

export async function verifierBudgetJournalier(): Promise<void> {
  const consomme = await tokensConsommesAujourdhui();
  if (consomme >= env.budgetTokensJourDefaut) {
    throw new ErreurIaIndisponible(`Budget de tokens quotidien atteint (${consomme}/${env.budgetTokensJourDefaut}) — réessayez demain.`);
  }
}
