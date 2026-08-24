import type { Idee, GenererIdeesEntree, IdeeGeneree } from "@achirah/shared";
import { api } from "../api.js";

export const clientIdees = {
  lister: (filtres: { statut?: string; article_coloris_id?: string; tache_id?: string; q?: string } = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtres).filter(([, v]) => v)) as Record<string, string>);
    const qs = params.toString();
    return api<{ donnees: Idee[] }>(`/idees${qs ? `?${qs}` : ""}`).then((r) => r.donnees);
  },
  obtenir: (id: string) => api<{ donnees: Idee }>(`/idees/${id}`).then((r) => r.donnees),
  creer: (corps: Partial<Idee>) => api<{ donnees: Idee }>("/idees", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Idee>) => api<{ donnees: Idee }>(`/idees/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/idees/${id}`, { method: "DELETE" }),
  generer: (entree: GenererIdeesEntree) => api<{ donnees: IdeeGeneree[] }>("/idees/generer", { method: "POST", body: entree }).then((r) => r.donnees),
};
