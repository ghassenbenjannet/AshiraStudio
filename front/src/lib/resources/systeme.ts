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

export interface ParametreConfiguration {
  cle: string;
  chiffre: boolean;
  defini: boolean;
  masque: string | null;
  valeur: string | null;
}

export interface ResultatTestConfiguration {
  ok: boolean;
  message: string;
  teste_le: string;
}

export type CategorieConfiguration = "ia" | "email" | "push" | "stockage" | "supervision" | "sauvegardes";

export interface BlocConfiguration {
  categorie: CategorieConfiguration;
  etat: "configure" | "non_configure" | "test_echoue";
  dernier_test: ResultatTestConfiguration | null;
  parametres: ParametreConfiguration[];
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

/**
 * CDC v4, Lot 2.3 (§8.3) — centre de configuration in-app : tous les réglages (hormis
 * `DATABASE_URL`/`ENCRYPTION_KEY`) se gèrent ici, sans fichier ni redémarrage.
 */
export const clientConfiguration = {
  lire: () => api<{ donnees: { blocs: BlocConfiguration[] } }>("/configuration").then((r) => r.donnees.blocs),
  ecrire: (cle: string, valeur: string | null) => api<void>(`/configuration/${cle}`, { method: "PUT", body: { valeur } }),
  tester: (categorie: CategorieConfiguration) => api<{ donnees: ResultatTestConfiguration }>(`/configuration/${categorie}/tester`, { method: "POST" }).then((r) => r.donnees),
};

export const clientExports = {
  contactsUrl: (format: "csv" | "json") => `/api/exports/contacts/${format}`,
  catalogueUrl: (format: "csv" | "json") => `/api/exports/catalogue/${format}`,
  campagnesUrl: (format: "csv" | "json") => `/api/exports/campagnes/${format}`,
  auditUrl: (format: "csv" | "json") => `/api/exports/audit/${format}`,
  rapportCampagnePdfUrl: (id: string) => `/api/exports/campagnes/${id}/rapport.pdf`,
};
