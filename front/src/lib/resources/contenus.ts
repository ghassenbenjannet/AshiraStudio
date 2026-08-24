import type { Contenu, ContenuVersion } from "@achirah/shared";
import { api } from "../api.js";

export const clientContenus = {
  lister: (filtres: { statut?: string; campagne_id?: string } = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtres).filter(([, v]) => v)) as Record<string, string>);
    const qs = params.toString();
    return api<{ donnees: Contenu[] }>(`/contenus${qs ? `?${qs}` : ""}`).then((r) => r.donnees);
  },
  obtenir: (id: string) => api<{ donnees: Contenu }>(`/contenus/${id}`).then((r) => r.donnees),
  creer: (corps: Partial<Contenu>) => api<{ donnees: Contenu }>("/contenus", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Contenu>) => api<{ donnees: Contenu }>(`/contenus/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  soumettre: (id: string) => api<{ donnees: Contenu }>(`/contenus/${id}/soumettre`, { method: "POST" }).then((r) => r.donnees),
  approuver: (id: string) => api<{ donnees: Contenu }>(`/contenus/${id}/approuver`, { method: "POST" }).then((r) => r.donnees),
  planifier: (id: string, datePublication: string) => api<{ donnees: Contenu }>(`/contenus/${id}/planifier`, { method: "POST", body: { date_publication: datePublication } }).then((r) => r.donnees),
  publier: (id: string) => api<{ donnees: Contenu }>(`/contenus/${id}/publier`, { method: "POST" }).then((r) => r.donnees),
  archiver: (id: string) => api<{ donnees: Contenu }>(`/contenus/${id}/archiver`, { method: "POST" }).then((r) => r.donnees),
  dupliquer: (id: string, plateformes?: string[]) => api<{ donnees: Contenu }>(`/contenus/${id}/dupliquer`, { method: "POST", body: { plateformes } }).then((r) => r.donnees),
  versions: (id: string) => api<{ donnees: ContenuVersion[] }>(`/contenus/${id}/versions`).then((r) => r.donnees),
  restaurerVersion: (id: string, versionId: string) => api<{ donnees: Contenu }>(`/contenus/${id}/versions/${versionId}/restaurer`, { method: "POST" }).then((r) => r.donnees),
  noterGate: (id: string) => api<{ donnees: { score_marque: number; score_detail: import("@achirah/shared").ScoreDetailDimension[] } }>(`/contenus/${id}/gate`, { method: "POST" }).then((r) => r.donnees),
};
