import type { Utilisateur, RoleSysteme, Langue } from "@achirah/shared";
import { api } from "../api.js";

export interface CreationUtilisateur {
  email: string;
  nom: string;
  mot_de_passe: string;
  role_systeme: RoleSysteme;
  langue?: Langue;
}

export const clientUtilisateurs = {
  lister: () => api<{ donnees: Utilisateur[] }>("/utilisateurs").then((r) => r.donnees),
  creer: (corps: CreationUtilisateur) => api<{ donnees: Utilisateur }>("/utilisateurs", { method: "POST", body: corps }).then((r) => r.donnees),
  modifier: (id: string, corps: Partial<{ nom: string; role_systeme: RoleSysteme; langue: Langue }>) =>
    api<{ donnees: Utilisateur }>(`/utilisateurs/${id}`, { method: "PATCH", body: corps }).then((r) => r.donnees),
};
