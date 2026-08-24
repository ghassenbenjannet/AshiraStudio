import type { Tache, Shooting, Look, LookItem, Pose } from "@achirah/shared";
import { api } from "../api.js";

interface ShootingEnrichi extends Shooting {
  pieces_effectives: { article_sku_id: string; note?: string }[];
  pret_a_tourner: { pret: boolean; manques: string[] };
}

export interface FiltresTaches {
  campagne_id?: string;
  type?: string;
  statut?: string;
  assigne_id?: string;
  quand?: "aujourdhui" | "semaine" | "retard";
}

export const clientTaches = {
  lister: (filtres: FiltresTaches = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtres).filter(([, v]) => v))).toString();
    return api<{ donnees: Tache[] }>(`/taches${params ? `?${params}` : ""}`).then((r) => r.donnees);
  },
  obtenir: (id: string) => api<{ donnees: Tache }>(`/taches/${id}`).then((r) => r.donnees),
  creer: (corps: Partial<Tache>) => api<{ donnees: Tache }>("/taches", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Tache>) => api<{ donnees: Tache }>(`/taches/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/taches/${id}`, { method: "DELETE" }),
  icsUrl: (id: string) => `/api/taches/${id}/ics`,

  obtenirShooting: (id: string) => api<{ donnees: ShootingEnrichi }>(`/taches/${id}/shooting`).then((r) => r.donnees),
  modifierShooting: (id: string, corps: Partial<Shooting>) => api<{ donnees: ShootingEnrichi }>(`/taches/${id}/shooting`, { method: "PATCH", body: corps }).then((r) => r.donnees),
};

export const clientShootings = {
  callsheetUrl: (id: string) => `/api/shootings/${id}/callsheet.pdf`,
  listerLooks: (id: string) => api<{ donnees: Look[] }>(`/shootings/${id}/looks`).then((r) => r.donnees),
  creerLook: (id: string, corps: Partial<Look>) => api<{ donnees: Look }>(`/shootings/${id}/looks`, { method: "POST", body: corps }).then((r) => r.donnees),
  listerPoses: (id: string) => api<{ donnees: Pose[] }>(`/shootings/${id}/poses`).then((r) => r.donnees),
  creerPose: (id: string, corps: Partial<Pose>) => api<{ donnees: Pose }>(`/shootings/${id}/poses`, { method: "POST", body: corps }).then((r) => r.donnees),
};

export const clientLooks = {
  modifier: (id: string, corps: Partial<Look>) => api<{ donnees: Look }>(`/looks/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/looks/${id}`, { method: "DELETE" }),
  listerItems: (id: string) => api<{ donnees: LookItem[] }>(`/looks/${id}/items`).then((r) => r.donnees),
  ajouterItem: (id: string, corps: Partial<LookItem>) => api<{ donnees: LookItem }>(`/looks/${id}/items`, { method: "POST", body: corps }).then((r) => r.donnees),
};

export const clientLookItems = {
  modifier: (id: string, corps: Partial<LookItem>) => api<{ donnees: LookItem }>(`/look-items/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/look-items/${id}`, { method: "DELETE" }),
};

export const clientPoses = {
  modifier: (id: string, corps: Partial<Pose>) => api<{ donnees: Pose }>(`/poses/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/poses/${id}`, { method: "DELETE" }),
};
