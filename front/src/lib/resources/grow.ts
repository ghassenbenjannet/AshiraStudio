import type { Recommandation, Tendance, Concurrent, ReleveConcurrent, Expression, Lecon } from "@achirah/shared";
import { api } from "../api.js";

export const clientRecommandations = {
  lister: (statut?: string) => api<{ donnees: Recommandation[] }>(`/recommandations${statut ? `?statut=${statut}` : ""}`).then((r) => r.donnees),
  generer: () => api<{ donnees: Recommandation[] }>("/recommandations/generer", { method: "POST" }).then((r) => r.donnees),
  modifier: (id: string, statut: Recommandation["statut"]) => api<{ donnees: Recommandation }>(`/recommandations/${id}`, { method: "PATCH", body: { statut } }).then((r) => r.donnees),
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

export const clientTendances = {
  lister: (statut?: string) => api<{ donnees: Tendance[] }>(`/tendances${statut ? `?statut=${statut}` : ""}`).then((r) => r.donnees),
  creer: (corps: Partial<Tendance>) => api<{ donnees: Tendance }>("/tendances", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Tendance>) => api<{ donnees: Tendance }>(`/tendances/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  rechercher: (categorie: string) => api<{ donnees: TendanceProposee[] }>("/tendances/rechercher", { method: "POST", body: { categorie } }).then((r) => r.donnees),
  adapter: (id: string) => api<{ donnees: Tendance }>(`/tendances/${id}/adapter`, { method: "POST" }).then((r) => r.donnees),
};

export const clientConcurrents = {
  lister: () => api<{ donnees: Concurrent[] }>("/concurrents").then((r) => r.donnees),
  creer: (corps: Partial<Concurrent>) => api<{ donnees: Concurrent }>("/concurrents", { method: "POST", body: corps }).then((r) => r.donnees),
  listerReleves: (id: string) => api<{ donnees: ReleveConcurrent[] }>(`/concurrents/${id}/releves`).then((r) => r.donnees),
  ajouterReleve: (id: string, corps: Partial<ReleveConcurrent>) => api<{ donnees: ReleveConcurrent }>(`/concurrents/${id}/releves`, { method: "POST", body: corps }).then((r) => r.donnees),
};

export const clientExpressions = {
  lister: (statut?: string) => api<{ donnees: Expression[] }>(`/expressions${statut ? `?statut=${statut}` : ""}`).then((r) => r.donnees),
  proposer: (corps: Partial<Expression>) => api<{ donnees: Expression }>("/expressions", { method: "POST", body: corps }).then((r) => r.donnees),
  valider: (id: string, statut: "validee" | "interdite") => api<{ donnees: Expression }>(`/expressions/${id}/valider`, { method: "POST", body: { statut } }).then((r) => r.donnees),
};

export const clientLecons = {
  lister: (statut?: string) => api<{ donnees: Lecon[] }>(`/lecons${statut ? `?statut=${statut}` : ""}`).then((r) => r.donnees),
  creer: (corps: Partial<Lecon>) => api<{ donnees: Lecon }>("/lecons", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Lecon>) => api<{ donnees: Lecon }>(`/lecons/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  reconfirmer: (id: string) => api<{ donnees: Lecon }>(`/lecons/${id}/reconfirmer`, { method: "POST" }).then((r) => r.donnees),
};
