import type { Conversation, Message } from "@achirah/shared";
import { api } from "../api.js";

export interface ActionAgent {
  id: string;
  conversation_id: string;
  message_id: string;
  groupe_id: string;
  outil: string;
  entree: Record<string, unknown>;
  avant: unknown;
  apres_previsualise: unknown;
  statut: "en_attente" | "confirmee" | "annulee";
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
  actions: ActionAgent[];
}

export interface ResultatTour {
  message: { id: string; contenu: string };
  actionsDirectes: { outil: string; entiteType: string; entiteId: string }[];
  actionsEnAttente: { id: string; outil: string; entree: Record<string, unknown>; avant: unknown; apres_previsualise: unknown }[];
  tokensUtilises: number;
}

export const clientConversations = {
  lister: () => api<{ donnees: Conversation[] }>("/conversations").then((r) => r.donnees),
  obtenir: (id: string) => api<{ donnees: ConversationDetail }>(`/conversations/${id}`).then((r) => r.donnees),
  creer: (agentId?: string | null) => api<{ donnees: Conversation }>("/conversations", { method: "POST", body: { agent_id: agentId ?? null } }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/conversations/${id}`, { method: "DELETE" }),
  envoyerMessage: (id: string, corps: { contenu: string; images?: string[]; campagne_id?: string; agent_id?: string }) =>
    api<{ donnees: ResultatTour }>(`/conversations/${id}/messages`, { method: "POST", body: corps }).then((r) => r.donnees),
  confirmerAction: (conversationId: string, actionId: string, entree?: Record<string, unknown>) =>
    api<{ donnees: { resultat: unknown } }>(`/conversations/${conversationId}/actions/${actionId}/confirmer`, { method: "POST", body: { entree } }).then((r) => r.donnees),
  annulerAction: (conversationId: string, actionId: string) => api<void>(`/conversations/${conversationId}/actions/${actionId}/annuler`, { method: "POST" }),
};
