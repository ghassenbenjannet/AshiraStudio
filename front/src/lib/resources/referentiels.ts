import type {
  Gamme,
  CategorieProduit,
  Coloris,
  Matiere,
  CodeEntretien,
  GrilleTaille,
  ListeSimple,
  ModeleChecklist,
  Registre,
  TypeCampagne,
  ModeleRituel,
} from "@achirah/shared";
import { api } from "../api.js";

interface Donnees<T> {
  donnees: T;
}

/** Client générique — miroir de la fabrique de routes serveur (lib/referentiel-crud.ts). */
export function creerClientReferentiel<T extends { id: string }, TInsert = Partial<T>>(chemin: string) {
  const base = `/referentiels/${chemin}`;
  return {
    lister: (avecArchives = false) => api<Donnees<T[]>>(`${base}${avecArchives ? "?archives=1" : ""}`).then((r) => r.donnees),
    creer: (corps: TInsert) => api<Donnees<T>>(base, { method: "POST", body: corps }).then((r) => r.donnees),
    modifier: (id: string, corps: Partial<TInsert>) =>
      api<Donnees<T>>(`${base}/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
    archiver: (id: string) => api<Donnees<T>>(`${base}/${id}`, { method: "DELETE" }).then((r) => r.donnees),
    reactiver: (id: string) => api<Donnees<T>>(`${base}/${id}/reactiver`, { method: "POST" }).then((r) => r.donnees),
  };
}

export const clientGammes = creerClientReferentiel<Gamme>("gammes");
export const clientCategoriesProduit = creerClientReferentiel<CategorieProduit>("categories-produit");
export const clientColoris = creerClientReferentiel<Coloris>("coloris");
export const clientMatieres = creerClientReferentiel<Matiere>("matieres");
export const clientCodesEntretien = creerClientReferentiel<CodeEntretien>("codes-entretien");
export const clientGrillesTaille = creerClientReferentiel<GrilleTaille>("grilles-taille");
export const clientPostesBudgetaires = creerClientReferentiel<ListeSimple>("postes-budgetaires");
export const clientCanaux = creerClientReferentiel<ListeSimple>("canaux");
export const clientPlateformesContenu = creerClientReferentiel<ListeSimple>("plateformes-contenu");
export const clientOccasions = creerClientReferentiel<ListeSimple>("occasions");
export const clientModelesChecklist = creerClientReferentiel<ModeleChecklist>("modeles-checklist");
export const clientRegistres = creerClientReferentiel<Registre>("registres");
export const clientTypesCampagne = creerClientReferentiel<TypeCampagne>("types-campagne");
export const clientModelesRituel = creerClientReferentiel<ModeleRituel>("modeles-rituel");
