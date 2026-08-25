import { generateText, generateObject, jsonSchema, tool, type ModelMessage, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { gte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { messages } from "../../db/schema.js";
import { lireParametres } from "../config-store.js";

/**
 * CDC v4, CR-01 (§5.2) — seul fichier autorisé à connaître un fournisseur IA. Toute la logique
 * métier (`services/ia/*`) passe par `genererObjet`/`genererTourConversation`, jamais par un SDK de
 * fournisseur directement — le SDK Anthropic historique a été retiré des dépendances, ce fichier
 * lui-même ne l'utilise plus (Vercel AI SDK uniquement). Le mécanisme est
 * agnostique ; la qualité des réponses, elle, dépend du fournisseur/modèle choisi dans
 * Paramètres > Configuration — ce n'est pas garanti équivalent d'un fournisseur à l'autre.
 */

export type { ModelMessage };

export class ErreurIaIndisponible extends Error {
  constructor(raison: string) {
    super(raison);
  }
}

export interface ConfigurationIa {
  fournisseur: string;
  modelePrincipal: string;
  modeleLeger: string;
  cleApi: string;
  baseUrl: string | null;
  budgetTokensJour: number;
}

const MODELES_DEFAUT: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5",
  google: "gemini-2.5-pro",
  mistral: "mistral-large-latest",
  openrouter: "anthropic/claude-sonnet-4-6",
  ollama: "llama3.3",
};

export async function lireConfigurationIa(): Promise<ConfigurationIa> {
  const p = await lireParametres(["ia.fournisseur", "ia.modele_principal", "ia.modele_leger", "ia.cle_api", "ia.base_url", "ia.plafond_tokens_jour"]);
  const fournisseur = p["ia.fournisseur"] ?? "anthropic";
  const modelePrincipal = p["ia.modele_principal"] || MODELES_DEFAUT[fournisseur] || "";
  return {
    fournisseur,
    modelePrincipal,
    modeleLeger: p["ia.modele_leger"] || modelePrincipal,
    cleApi: p["ia.cle_api"] ?? "",
    baseUrl: p["ia.base_url"] || null,
    budgetTokensJour: Number(p["ia.plafond_tokens_jour"] ?? 2_000_000),
  };
}

/**
 * RG-CFG5 / scénario recette 6 (« Panne IA ») — jamais d'instanciation tant que la configuration
 * est incomplète : le Studio, le gate, le brief et les agents refusent proprement (503 honnête),
 * tout le reste (écritures manuelles incluses) continue à fonctionner à 100 % (RG-PAR1d).
 */
export async function verifierDisponibiliteIa(): Promise<ConfigurationIa> {
  const config = await lireConfigurationIa();
  const cleRequise = config.fournisseur !== "ollama";
  if (cleRequise && !config.cleApi) {
    throw new ErreurIaIndisponible("IA indisponible : configurez une clé API depuis Paramètres > Configuration.");
  }
  if (config.fournisseur === "openai_compatible" && !config.baseUrl) {
    throw new ErreurIaIndisponible("IA indisponible : renseignez l'URL du fournisseur compatible OpenAI depuis Paramètres > Configuration.");
  }
  if (!config.modelePrincipal) {
    throw new ErreurIaIndisponible("IA indisponible : configurez un modèle depuis Paramètres > Configuration.");
  }
  return config;
}

function construireModeleLangage(config: ConfigurationIa, leger = false): LanguageModel {
  const modele = leger ? config.modeleLeger : config.modelePrincipal;
  const baseURL = config.baseUrl ? { baseURL: config.baseUrl } : {};
  switch (config.fournisseur) {
    case "anthropic":
      return createAnthropic({ apiKey: config.cleApi, ...baseURL })(modele);
    case "openai":
      return createOpenAI({ apiKey: config.cleApi, ...baseURL })(modele);
    case "google":
      return createGoogleGenerativeAI({ apiKey: config.cleApi, ...baseURL })(modele);
    case "mistral":
      return createMistral({ apiKey: config.cleApi, ...baseURL })(modele);
    case "openrouter":
      return createOpenAI({ apiKey: config.cleApi, baseURL: config.baseUrl || "https://openrouter.ai/api/v1" })(modele);
    case "ollama":
      // Ollama n'exige pas de clé — une valeur factice satisfait les SDK qui en imposent une non vide.
      return createOpenAI({ apiKey: config.cleApi || "ollama", baseURL: config.baseUrl || "http://localhost:11434/v1" })(modele);
    case "openai_compatible":
      return createOpenAI({ apiKey: config.cleApi || "sans-cle", baseURL: config.baseUrl! })(modele);
    default:
      throw new ErreurIaIndisponible(`Fournisseur IA inconnu : « ${config.fournisseur} ». Vérifiez Paramètres > Configuration.`);
  }
}

export type ImageEntree = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

export function messageUtilisateur(texte: string, images: ImageEntree[] = []): ModelMessage {
  if (images.length === 0) return { role: "user", content: texte || "(vide)" };
  return {
    role: "user",
    content: [{ type: "text", text: texte || "(vide)" }, ...images.map((img) => ({ type: "image" as const, image: img.base64, mediaType: img.mediaType }))],
  };
}

// ───────────────────────── Génération d'un objet structuré (remplace l'ancien appelOutilForce) ─────────────────────────

export async function genererObjet<T>(params: {
  system: string;
  message: string | { texte: string; images?: ImageEntree[] };
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
  leger?: boolean;
}): Promise<{ donnees: T; tokens: number }> {
  const config = await verifierDisponibiliteIa();
  const modele = construireModeleLangage(config, params.leger);
  const messageEntree = typeof params.message === "string" ? messageUtilisateur(params.message) : messageUtilisateur(params.message.texte, params.message.images);

  const resultat = await generateObject({
    model: modele,
    system: params.system,
    messages: [messageEntree],
    schema: jsonSchema<T>(params.schema as any),
    maxOutputTokens: params.maxOutputTokens ?? 1024,
  });

  const tokens = (resultat.usage.inputTokens ?? 0) + (resultat.usage.outputTokens ?? 0);
  return { donnees: resultat.object, tokens };
}

// ───────────────────────── Boucle de conversation multi-tours (remplace le client Anthropic direct) ─────────────────────────

export interface DefinitionOutilAppelable {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AppelOutilDetecte {
  id: string;
  nom: string;
  entree: Record<string, unknown>;
}

export interface ResultatTourConversation {
  texte: string;
  appelsOutils: AppelOutilDetecte[];
  nouveauxMessages: ModelMessage[];
  tokens: number;
}

/**
 * Un seul tour de conversation : le modèle répond en texte et/ou en appels d'outils, jamais exécutés
 * ici (RG-AGW* — orchestration manuelle côté appelant, aucun `execute` fourni aux outils).
 */
export async function genererTourConversation(params: {
  system: string;
  messages: ModelMessage[];
  outils?: DefinitionOutilAppelable[];
  maxOutputTokens?: number;
}): Promise<ResultatTourConversation> {
  const config = await verifierDisponibiliteIa();
  const modele = construireModeleLangage(config);

  const toolSet: Record<string, ReturnType<typeof tool>> = {};
  for (const o of params.outils ?? []) {
    toolSet[o.name] = tool({ description: o.description, inputSchema: jsonSchema(o.input_schema) });
  }

  const resultat = await generateText({
    model: modele,
    system: params.system,
    messages: params.messages,
    tools: toolSet,
    maxOutputTokens: params.maxOutputTokens ?? 2048,
  });

  const tokens = (resultat.usage.inputTokens ?? 0) + (resultat.usage.outputTokens ?? 0);
  return {
    texte: resultat.text,
    appelsOutils: resultat.toolCalls.map((tc) => ({ id: tc.toolCallId, nom: tc.toolName, entree: tc.input as Record<string, unknown> })),
    nouveauxMessages: resultat.responseMessages,
    tokens,
  };
}

export function messageResultatsOutils(resultats: { id: string; nom: string; contenu: string; erreur?: boolean }[]): ModelMessage {
  return {
    role: "tool",
    content: resultats.map((r) => ({
      type: "tool-result" as const,
      toolCallId: r.id,
      toolName: r.nom,
      output: { type: r.erreur ? ("error-text" as const) : ("text" as const), value: r.contenu },
    })),
  };
}

// ───────────────────────── Budget tokens/jour (§6.1) ─────────────────────────

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function tokensConsommesAujourdhui(): Promise<number> {
  const debut = `${aujourdhuiIso()}T00:00:00.000Z`;
  const lignes = await db.select({ tokens: messages.tokens }).from(messages).where(gte(messages.created_at, debut));
  return lignes.reduce((somme, l) => somme + (l.tokens ?? 0), 0);
}

export async function verifierBudgetJournalier(): Promise<void> {
  const consomme = await tokensConsommesAujourdhui();
  const budget = (await lireConfigurationIa()).budgetTokensJour;
  if (consomme >= budget) {
    throw new ErreurIaIndisponible(`Budget de tokens quotidien atteint (${consomme}/${budget}) — réessayez demain.`);
  }
}
