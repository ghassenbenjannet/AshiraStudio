import type { Commentaire, Notification, TypeNotification, CanalNotification } from "@achirah/shared";
import { api } from "../api.js";

export const clientCommentaires = {
  lister: (entiteType: string, entiteId: string) =>
    api<{ donnees: Commentaire[] }>(`/commentaires?entite_type=${entiteType}&entite_id=${entiteId}`).then((r) => r.donnees),
  creer: (entiteType: string, entiteId: string, contenu: string) =>
    api<{ donnees: Commentaire }>("/commentaires", { method: "POST", body: { entite_type: entiteType, entite_id: entiteId, contenu } }).then((r) => r.donnees),
  resoudre: (id: string, resolu: boolean) =>
    api<{ donnees: Commentaire }>(`/commentaires/${id}/resolution`, { method: "PATCH", body: { resolu } }).then((r) => r.donnees),
  retirer: (id: string) => api<{ donnees: Commentaire }>(`/commentaires/${id}/retirer`, { method: "POST", body: {} }).then((r) => r.donnees),
};

export const clientNotifications = {
  lister: (nonLues?: boolean) => api<{ donnees: Notification[] }>(`/notifications${nonLues ? "?non_lues=true" : ""}`).then((r) => r.donnees),
  marquerLu: (id: string) => api<{ donnees: Notification }>(`/notifications/${id}/lu`, { method: "POST", body: {} }).then((r) => r.donnees),
  marquerToutLu: () => api<{ donnees: { ok: boolean } }>("/notifications/lu-tout", { method: "POST", body: {} }).then((r) => r.donnees),
  reglages: () => api<{ donnees: { type: TypeNotification; canaux: CanalNotification[] }[] }>("/notifications/reglages").then((r) => r.donnees),
  modifierReglage: (type: TypeNotification, canaux: CanalNotification[]) =>
    api<{ donnees: { type: TypeNotification; canaux: CanalNotification[] } }>(`/notifications/reglages/${type}`, { method: "PUT", body: { canaux } }).then((r) => r.donnees),
};
