import type { Board, BoardItem, Campagne } from "@achirah/shared";
import { api } from "../api.js";

export interface EntreeTransformerEnCampagne {
  item_ids: string[];
  nom: string;
  type_campagne_id: string;
  date_debut: string;
  date_fin: string;
  objectif: string;
}

export const clientBoards = {
  lister: (campagneId?: string) => api<{ donnees: Board[] }>(`/boards${campagneId ? `?campagne_id=${campagneId}` : ""}`).then((r) => r.donnees),
  obtenir: (id: string) => api<{ donnees: Board }>(`/boards/${id}`).then((r) => r.donnees),
  creer: (corps: { nom: string; campagne_id?: string | null }) => api<{ donnees: Board }>("/boards", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<Board>) => api<{ donnees: Board }>(`/boards/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
  supprimer: (id: string) => api<void>(`/boards/${id}`, { method: "DELETE" }),
  ajouterItem: (boardId: string, item: Omit<BoardItem, "id">) => api<{ donnees: Board }>(`/boards/${boardId}/items`, { method: "POST", body: item }).then((r) => r.donnees),
  modifierItem: (boardId: string, itemId: string, patch: Partial<Omit<BoardItem, "id">>) =>
    api<{ donnees: Board }>(`/boards/${boardId}/items/${itemId}`, { method: "PATCH", body: patch }).then((r) => r.donnees),
  supprimerItem: (boardId: string, itemId: string) => api<{ donnees: Board }>(`/boards/${boardId}/items/${itemId}`, { method: "DELETE" }).then((r) => r.donnees),
  transformerEnCampagne: (boardId: string, entree: EntreeTransformerEnCampagne) =>
    api<{ donnees: Campagne }>(`/boards/${boardId}/transformer-en-campagne`, { method: "POST", body: entree }).then((r) => r.donnees),
};
