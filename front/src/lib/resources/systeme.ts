import type { Audit } from "@achirah/shared";
import { api } from "../api.js";

export interface Sauvegarde {
  nom: string;
  at: string;
  taille_octets: number;
}

export interface StatutObservabilite {
  uptime_secondes: number;
  taille_db_octets: number | null;
  derniere_sauvegarde: Sauvegarde | null;
  tokens_ia_aujourdhui: number;
  budget_tokens_jour: number;
  audits_aujourdhui: number;
  integrations: { plateforme: string; statut: string; dernier_sync: string | null }[];
  ia_configuree: boolean;
}

export interface ConfigurationIa {
  configuree: boolean;
  fournisseur: "anthropic";
  modele: string;
  budget_tokens_jour: number;
  cle_masquee: string | null;
}

export interface FiltresAudit {
  entite_type?: string;
  utilisateur_id?: string;
  action?: string;
  depuis?: string;
  jusqua?: string;
  page?: number;
}

export const clientAudit = {
  lister: (filtres: FiltresAudit = {}) => {
    const params = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(filtres)) if (valeur !== undefined) params.set(cle, String(valeur));
    const requete = params.toString();
    return api<{ donnees: Audit[]; total: number; page: number; taille: number }>(`/audit${requete ? `?${requete}` : ""}`);
  },
};

export const clientSauvegardes = {
  lister: () => api<{ donnees: Sauvegarde[] }>("/sauvegardes").then((r) => r.donnees),
  creer: () => api<{ donnees: Sauvegarde }>("/sauvegardes", { method: "POST", body: {} }).then((r) => r.donnees),
};

export const clientObservabilite = {
  statut: () => api<{ donnees: StatutObservabilite }>("/observabilite/statut").then((r) => r.donnees),
};

export const clientConfigurationIa = {
  lire: () => api<{ donnees: ConfigurationIa }>("/configuration/ia").then((r) => r.donnees),
  enregistrer: (entree: { api_key?: string; modele: string; budget_tokens_jour: number }) =>
    api<{ donnees: ConfigurationIa }>("/configuration/ia", { method: "PUT", body: entree }).then((r) => r.donnees),
  desactiver: () => api<void>("/configuration/ia", { method: "DELETE" }),
};

export const clientExports = {
  contactsUrl: (format: "csv" | "json") => `/api/exports/contacts/${format}`,
  catalogueUrl: (format: "csv" | "json") => `/api/exports/catalogue/${format}`,
  campagnesUrl: (format: "csv" | "json") => `/api/exports/campagnes/${format}`,
  auditUrl: (format: "csv" | "json") => `/api/exports/audit/${format}`,
  rapportCampagnePdfUrl: (id: string) => `/api/exports/campagnes/${id}/rapport.pdf`,
};
