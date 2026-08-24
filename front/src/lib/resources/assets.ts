import type { Asset } from "@achirah/shared";
import { api } from "../api.js";

export interface FiltresAssets {
  type?: string;
  tag?: string;
  campagne_id?: string;
  article_coloris_id?: string;
  createur_personne_id?: string;
  q?: string;
}

export interface LiensAsset {
  utilise_dans: { entite_type: string; entite_id: string; titre: string }[];
  vient_de: { entite_type: string; entite_id: string; titre: string } | null;
}

async function reponseJson<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error?.message ?? "Échec de la requête");
  return (await r.json()).donnees as T;
}

export const clientAssets = {
  parIds: (ids: string[]) => {
    if (ids.length === 0) return Promise.resolve([] as Asset[]);
    return api<{ donnees: Asset[] }>(`/assets?ids=${ids.join(",")}`).then((r) => r.donnees);
  },
  lister: (filtres: FiltresAssets = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtres).filter(([, v]) => v)) as Record<string, string>);
    const qs = params.toString();
    return api<{ donnees: Asset[] }>(`/assets${qs ? `?${qs}` : ""}`).then((r) => r.donnees);
  },
  obtenir: (id: string) => api<{ donnees: Asset }>(`/assets/${id}`).then((r) => r.donnees),
  liens: (id: string) => api<{ donnees: LiensAsset }>(`/assets/${id}/liens`).then((r) => r.donnees),
  quotas: () => api<{ donnees: { nombre_assets: number; taille_totale_octets: number; note: string } }>("/assets/quotas").then((r) => r.donnees),
  creerExterne: (corps: Partial<Asset>) => api<{ donnees: Asset }>("/assets", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Asset>) => api<{ donnees: Asset }>(`/assets/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  masse: (ids: string[], ajout: { tags?: string[]; campagne_ids?: string[]; article_coloris_ids?: string[] }) =>
    api<{ donnees: Asset[] }>("/assets/masse", { method: "POST", body: { ids, ...ajout } }).then((r) => r.donnees),
  televerser: (
    fichiers: File[],
    champs: { type: string; source: string; nom?: string; tags?: string; campagne_ids?: string; article_coloris_ids?: string; createur_personne_ids?: string; droits?: string },
  ) => {
    const form = new FormData();
    fichiers.forEach((f) => form.append("fichiers", f));
    Object.entries(champs).forEach(([cle, valeur]) => {
      if (valeur) form.append(cle, valeur);
    });
    return fetch("/api/assets/upload", { method: "POST", credentials: "include", body: form }).then((r) => reponseJson<Asset[]>(r));
  },
};
