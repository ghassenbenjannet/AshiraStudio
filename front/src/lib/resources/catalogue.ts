import type { Article, ArticleColoris, ArticleSku, ArticleCout, StatutCycleArticle, ArticleImportResultatLigne } from "@achirah/shared";
import { api } from "../api.js";

export interface FiltresArticles {
  gamme_id?: string;
  statut?: string;
  categorie_id?: string;
  q?: string;
}

export const clientArticles = {
  lister: (filtres: FiltresArticles = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filtres).filter(([, v]) => v))).toString();
    return api<{ donnees: Article[] }>(`/articles${params ? `?${params}` : ""}`).then((r) => r.donnees);
  },
  obtenir: (id: string) => api<{ donnees: Article }>(`/articles/${id}`).then((r) => r.donnees),
  creer: (corps: Partial<Article>) => api<{ donnees: Article }>("/articles", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Article>) => api<{ donnees: Article }>(`/articles/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  transitionner: (id: string, vers: StatutCycleArticle, options: { essaye_sur_5_morphologies?: boolean; confirmer_archivage_utilise?: boolean } = {}) =>
    api<{ donnees: Article; avertissements: string[] }>(`/articles/${id}/transition`, { method: "POST", body: { vers, ...options } }),
  historique: (id: string) => api<{ donnees: unknown[] }>(`/articles/${id}/historique`).then((r) => r.donnees),
  obtenirCouts: (id: string) => api<{ donnees: ArticleCout | null; cogs: number | null; marge_pct: number | null }>(`/articles/${id}/couts`),
  enregistrerCouts: (id: string, corps: Omit<ArticleCout, "article_id">) => api<{ donnees: ArticleCout }>(`/articles/${id}/couts`, { method: "PUT", body: corps }).then((r) => r.donnees),
  listerColoris: (id: string) => api<{ donnees: ArticleColoris[] }>(`/articles/${id}/coloris`).then((r) => r.donnees),
  creerColoris: (id: string, corps: Partial<ArticleColoris>) => api<{ donnees: ArticleColoris }>(`/articles/${id}/coloris`, { method: "POST", body: corps }).then((r) => r.donnees),
  importerGabaritUrl: "/api/articles/import/gabarit",
  importer: async (texte: string, dryRun: boolean) => {
    const reponse = await fetch(`/api/articles/import${dryRun ? "?dry_run=1" : ""}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "text/csv" },
      body: texte,
    });
    const donnees = await reponse.json().catch(() => null);
    if (!reponse.ok) throw new Error(donnees?.error?.message ?? "Import invalide");
    return donnees.donnees as { resultats: ArticleImportResultatLigne[]; nb_nouveaux: number; nb_mises_a_jour: number; nb_erreurs: number };
  },
};

export const clientArticleColoris = {
  obtenir: (id: string) => api<{ donnees: ArticleColoris }>(`/coloris/${id}`).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<ArticleColoris> & { confirmer_baisse_prix?: boolean }) =>
    api<{ donnees: ArticleColoris }>(`/coloris/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  listerSkus: (id: string) => api<{ donnees: ArticleSku[] }>(`/coloris/${id}/skus`).then((r) => r.donnees),
  creerSku: (id: string, corps: Partial<ArticleSku>) => api<{ donnees: ArticleSku }>(`/coloris/${id}/skus`, { method: "POST", body: corps }).then((r) => r.donnees),
  televerserPhotos: (id: string, fichiers: File[]) => {
    const form = new FormData();
    fichiers.forEach((f) => form.append("fichiers", f));
    return fetch(`/api/coloris/${id}/photos`, { method: "POST", credentials: "include", body: form }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error?.message ?? "Échec de l'envoi");
      return (await r.json()).donnees as ArticleColoris;
    });
  },
};

export const clientArticleSkus = {
  modifier: (id: string, corps: Partial<ArticleSku>) => api<{ donnees: ArticleSku }>(`/skus/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  detail: (id: string) => api<{ donnees: { sku: ArticleSku; label: string } }>(`/skus/${id}/detail`).then((r) => r.donnees),
};
