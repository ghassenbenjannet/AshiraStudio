import type { AgentCampagne } from "@achirah/shared";
import { api } from "../api.js";

export const clientAgents = {
  lister: (campagneId?: string) => api<{ donnees: AgentCampagne[] }>(`/agents${campagneId ? `?campagne_id=${campagneId}` : ""}`).then((r) => r.donnees),
  obtenir: (id: string) => api<{ donnees: AgentCampagne }>(`/agents/${id}`).then((r) => r.donnees),
  creer: (corps: Partial<AgentCampagne>) => api<{ donnees: AgentCampagne }>("/agents", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<AgentCampagne>) => api<{ donnees: AgentCampagne }>(`/agents/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  tester: (id: string, message: string) => api<{ donnees: { contenu: string } }>(`/agents/${id}/tester`, { method: "POST", body: { message } }).then((r) => r.donnees),
};
