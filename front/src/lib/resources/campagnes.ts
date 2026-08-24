import type { Campagne, CampagneArticle, AjoutIntelligent, BudgetLigne, Tache } from "@achirah/shared";
import { api } from "../api.js";

export const clientCampagnes = {
  lister: (statut?: string) => api<{ donnees: Campagne[] }>(`/campagnes${statut ? `?statut=${statut}` : ""}`).then((r) => r.donnees),
  obtenir: (id: string) => api<{ donnees: Campagne }>(`/campagnes/${id}`).then((r) => r.donnees),
  creer: (corps: Partial<Campagne>) => api<{ donnees: Campagne }>("/campagnes", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Campagne>) => api<{ donnees: Campagne }>(`/campagnes/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  activer: (id: string) => api<{ donnees: Campagne }>(`/campagnes/${id}/activer`, { method: "POST" }).then((r) => r.donnees),
  fermer: (id: string, rapport: { marche: string; pas_marche: string; decisions: string }) =>
    api<{ donnees: Campagne }>(`/campagnes/${id}/fermer`, { method: "POST", body: { rapport } }).then((r) => r.donnees),
  fermerDeForce: (id: string, rapport: { marche: string; pas_marche: string; decisions: string }) =>
    api<{ donnees: Campagne }>(`/campagnes/${id}/fermer-de-force`, { method: "POST", body: { rapport } }).then((r) => r.donnees),
  genererRituel: (id: string) => api<{ donnees: Tache[] }>(`/campagnes/${id}/rituel`, { method: "POST" }).then((r) => r.donnees),
  consolidation: (id: string) => api<{ donnees: any }>(`/campagnes/${id}/consolidation`).then((r) => r.donnees),
  detteDeMesure: () => api<{ donnees: Campagne[] }>("/campagnes/dette-mesure").then((r) => r.donnees),

  listerArticles: (id: string) => api<{ donnees: CampagneArticle[] }>(`/campagnes/${id}/articles`).then((r) => r.donnees),
  ajouterArticle: (id: string, entree: AjoutIntelligent) => api<{ donnees: CampagneArticle }>(`/campagnes/${id}/articles`, { method: "POST", body: entree }).then((r) => r.donnees),
  promouvoirArticle: (campagneId: string, ligneId: string, articleColorisId: string) =>
    api<{ donnees: CampagneArticle }>(`/campagnes/${campagneId}/articles/${ligneId}/promouvoir`, { method: "PATCH", body: { article_coloris_id: articleColorisId } }).then((r) => r.donnees),

  listerBudget: (id: string) => api<{ donnees: BudgetLigne[] }>(`/campagnes/${id}/budget`).then((r) => r.donnees),
  ajouterBudget: (id: string, corps: Partial<BudgetLigne>) => api<{ donnees: BudgetLigne }>(`/campagnes/${id}/budget`, { method: "POST", body: corps }).then((r) => r.donnees),
  modifierBudget: (campagneId: string, ligneId: string, corps: Partial<BudgetLigne>) =>
    api<{ donnees: BudgetLigne }>(`/campagnes/${campagneId}/budget/${ligneId}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimerBudget: (campagneId: string, ligneId: string) => api<void>(`/campagnes/${campagneId}/budget/${ligneId}`, { method: "DELETE" }),
};
