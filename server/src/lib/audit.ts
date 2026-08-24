import { db } from "../db/client.js";
import { audits } from "../db/schema.js";

export interface EnregistrerAuditInput {
  utilisateurId: string;
  action: string;
  entiteType: string;
  entiteId?: string | null;
  avant?: Record<string, unknown> | null;
  apres?: Record<string, unknown> | null;
  viaAgent?: boolean;
  conversationId?: string | null;
}

/** Point d'entrée unique pour l'audit (§4.9) — utilisé par les routes classiques ET l'exécuteur d'outils agent. */
export async function enregistrerAudit(input: EnregistrerAuditInput): Promise<void> {
  await db.insert(audits).values({
    utilisateur_id: input.utilisateurId,
    action: input.action,
    entite_type: input.entiteType,
    entite_id: input.entiteId ?? null,
    avant: input.avant ?? null,
    apres: input.apres ?? null,
    via_agent: input.viaAgent ?? false,
    conversation_id: input.conversationId ?? null,
  });
}
