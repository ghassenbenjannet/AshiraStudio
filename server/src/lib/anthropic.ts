import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";
import { db, sqlite } from "../db/client.js";
import { messages } from "../db/schema.js";
import { gte } from "drizzle-orm";
import { dechiffrer } from "./crypto.js";

export interface ConfigurationIaInterne {
  apiKey: string;
  modele: string;
  budgetTokensJour: number;
}

const MODELE_IA_DEFAUT = "claude-sonnet-4-6";
export let MODELE_IA = MODELE_IA_DEFAUT;

export class ErreurIaIndisponible extends Error {
  constructor(raison: string) {
    super(raison);
  }
}

let client: Anthropic | null = null;
let cleClient = "";

export function lireConfigurationIa(): ConfigurationIaInterne {
  let stockee: Partial<ConfigurationIaInterne> = {};
  try {
    const ligne = sqlite.prepare("SELECT valeur_chiffree FROM configurations_systeme WHERE cle = ?").get("ia") as { valeur_chiffree: string } | undefined;
    if (ligne) stockee = JSON.parse(dechiffrer(ligne.valeur_chiffree)) as Partial<ConfigurationIaInterne>;
  } catch {
    // Une base pas encore migrée ou une valeur illisible rend simplement l'IA indisponible.
  }
  const configuration = {
    apiKey: stockee.apiKey ?? "",
    modele: stockee.modele ?? MODELE_IA_DEFAUT,
    budgetTokensJour: stockee.budgetTokensJour ?? env.budgetTokensJourDefaut,
  };
  MODELE_IA = configuration.modele;
  return configuration;
}

/**
 * Client Anthropic paresseux — jamais instancié si la clé est absente. Scénario recette 6
 * (« Panne IA ») : clé coupée → Studio/agents/gate/brief refusent proprement, tout le reste
 * (écritures manuelles incluses) continue à fonctionner à 100 % (RG-PAR1d).
 */
export function clientAnthropic(): Anthropic {
  const configuration = lireConfigurationIa();
  if (!configuration.apiKey) {
    throw new ErreurIaIndisponible("IA indisponible : configurez une clé API depuis Paramètres > Intégrations & IA.");
  }
  if (!client || cleClient !== configuration.apiKey) {
    client = new Anthropic({ apiKey: configuration.apiKey });
    cleClient = configuration.apiKey;
  }
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
  const budget = lireConfigurationIa().budgetTokensJour;
  if (consomme >= budget) {
    throw new ErreurIaIndisponible(`Budget de tokens quotidien atteint (${consomme}/${budget}) — réessayez demain.`);
  }
}
