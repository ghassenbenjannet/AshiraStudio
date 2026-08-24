import type { MetriqueSnapshot, Integration } from "@achirah/shared";
import { api } from "../api.js";

export const clientMesure = {
  listerSnapshots: (filtres: { plateforme?: string; campagne_id?: string } = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtres).filter(([, v]) => v))).toString();
    return api<{ donnees: MetriqueSnapshot[] }>(`/mesure/snapshots${params ? `?${params}` : ""}`).then((r) => r.donnees);
  },
  creerSnapshot: (corps: { plateforme: string; date: string; kpis: Record<string, number>; campagne_id?: string | null }) =>
    api<{ donnees: MetriqueSnapshot }>("/mesure/snapshots", { method: "POST", body: corps }).then((r) => r.donnees),
};

export const clientIntegrations = {
  lister: () => api<{ donnees: Integration[] }>("/mesure/integrations").then((r) => r.donnees),
  connecter: (plateforme: string, credentials: Record<string, string>) =>
    api<{ donnees: Integration }>("/mesure/integrations", { method: "POST", body: { plateforme, credentials } }).then((r) => r.donnees),
  sync: (id: string) => api<{ donnees: Integration }>(`/mesure/integrations/${id}/sync`, { method: "POST" }).then((r) => r.donnees),
  deconnecter: (id: string) => api<{ donnees: Integration }>(`/mesure/integrations/${id}/deconnecter`, { method: "POST" }).then((r) => r.donnees),
};
