import { genererObjet, verifierBudgetJournalier } from "../../lib/ia/fournisseur.js";
import { construireSystemPrompt } from "./contexte.js";

const SCHEMA_TENDANCES = {
  type: "object",
  properties: {
    tendances: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titre: { type: "string" },
          description: { type: "string" },
          lien: { type: "string", description: "URL source réelle et vérifiable, sinon omettre le champ" },
          source_verifiee: { type: "boolean", description: "true UNIQUEMENT si le lien pointe vers une source réelle que tu es certain d'avoir vue — sinon false (RG-TR1)" },
          tunisia_fit: { type: "number", minimum: 0, maximum: 10 },
          achirah_fit: { type: "number", minimum: 0, maximum: 10 },
          audience_fit: { type: "number", minimum: 0, maximum: 10 },
          maturite: { type: "string", enum: ["emergente", "pic", "declin"] },
        },
        required: ["titre", "description", "source_verifiee", "tunisia_fit", "achirah_fit", "audience_fit", "maturite"],
      },
    },
  },
  required: ["tendances"],
};

export interface TendanceProposee {
  titre: string;
  description: string;
  lien?: string;
  source_verifiee: boolean;
  tunisia_fit: number;
  achirah_fit: number;
  audience_fit: number;
  maturite: "emergente" | "pic" | "declin";
}

/**
 * §4.7 — Recherche de tendances. Aucun outil de navigation web en direct : le modèle s'appuie sur
 * ses connaissances et DOIT marquer `source_verifiee=false` dès qu'il n'a pas de lien réel et
 * vérifié (RG-TR1 — badge « non vérifiée » plutôt qu'une source inventée).
 */
export async function rechercherTendances(categorie: string): Promise<TendanceProposee[]> {
  await verifierBudgetJournalier();
  const system = await construireSystemPrompt({});
  const message = `Propose 3 à 5 tendances actuelles pertinentes pour la catégorie « ${categorie} » (mode/culture tunisienne ou internationale selon la catégorie). Pour chacune, indique honnêtement si tu as une source réelle et vérifiable (lien) — sinon source_verifiee=false, sans jamais inventer un lien.`;
  const { donnees } = await genererObjet<{ tendances: TendanceProposee[] }>({ system, message, schema: SCHEMA_TENDANCES, maxOutputTokens: 1500 });
  return donnees.tendances;
}

const SCHEMA_ADAPTATION = {
  type: "object",
  properties: { declinaisons: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 } },
  required: ["declinaisons"],
};

export async function adapterTendance(titre: string, description: string): Promise<string[]> {
  await verifierBudgetJournalier();
  const system = await construireSystemPrompt({});
  const message = `Tendance : « ${titre} » — ${description}\n\nPropose exactement 3 déclinaisons concrètes de cette tendance conformes à la marque ACHIRAH (Brand Brain fourni en contexte) : chacune en 2-3 phrases décrivant l'idée de contenu adaptée.`;
  const { donnees } = await genererObjet<{ declinaisons: string[] }>({ system, message, schema: SCHEMA_ADAPTATION, maxOutputTokens: 800 });
  return donnees.declinaisons;
}
