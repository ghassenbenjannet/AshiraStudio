import type { Personne, CategorieContact, Ambassadeur } from "@achirah/shared";
import { api } from "../api.js";

export const clientCategoriesContact = {
  lister: () => api<{ donnees: CategorieContact[] }>("/categories-contact").then((r) => r.donnees),
  creer: (corps: Omit<CategorieContact, "id">) => api<{ donnees: CategorieContact }>("/categories-contact", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Omit<CategorieContact, "id">>) =>
    api<{ donnees: CategorieContact }>(`/categories-contact/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/categories-contact/${id}`, { method: "DELETE" }),
};

export interface FiltresPersonnes {
  categorie_id?: string;
  type?: string;
  actif?: "1" | "0";
  q?: string;
}

export const clientPersonnes = {
  lister: (filtres: FiltresPersonnes = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtres).filter(([, v]) => v))).toString();
    return api<{ donnees: Personne[] }>(`/personnes${params ? `?${params}` : ""}`).then((r) => r.donnees);
  },
  obtenir: (id: string) => api<{ donnees: Personne }>(`/personnes/${id}`).then((r) => r.donnees),
  creer: (corps: Partial<Personne>) => api<{ donnees: Personne }>("/personnes", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Personne>) => api<{ donnees: Personne }>(`/personnes/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  desactiver: (id: string) => api<{ donnees: Personne }>(`/personnes/${id}`, { method: "DELETE" }).then((r) => r.donnees),
  partager: (id: string) => api<{ donnees: { token: string; expire_at: string; chemin: string } }>(`/personnes/${id}/partage`, { method: "POST" }).then((r) => r.donnees),
};

export const clientAmbassadeurs = {
  lister: (statut?: string) => api<{ donnees: Ambassadeur[] }>(`/ambassadeurs${statut ? `?statut=${statut}` : ""}`).then((r) => r.donnees),
  obtenir: (personneId: string) => api<{ donnees: Ambassadeur }>(`/ambassadeurs/${personneId}`).then((r) => r.donnees),
  creer: (corps: Ambassadeur) => api<{ donnees: Ambassadeur }>("/ambassadeurs", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (personneId: string, corps: Partial<Ambassadeur>) =>
    api<{ donnees: Ambassadeur }>(`/ambassadeurs/${personneId}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
};
