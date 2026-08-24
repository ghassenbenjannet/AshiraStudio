import { ROLES_SYSTEME, type RoleSysteme } from "./enums.js";

/**
 * Capacités dérivées mot pour mot du tableau §2.1 du CDC.
 * `montants.voir` couvre RG-R2 (budgets, tarifs, COGS, marges masqués à contributeur/lecteur) —
 * distinct de `edition` : editeur peut éditer ET voir les montants, contributeur peut éditer mais pas voir les montants.
 */
export const CAPACITES = [
  "parametres.gerer", // Paramètres, utilisateurs, intégrations, budgets, coûts articles, fermeture forcée
  "approbation.gerer", // Approuver contenus, valider lexique, gérer agents/catégories/référentiels
  "entites.editer", // Créer/modifier tâches, contenus, assets, idées, looks, fiches
  "entites.voir", // Tout voir (hors montants)
  "commentaire.creer",
  "montants.voir", // RG-R2
] as const;
export type Capacite = (typeof CAPACITES)[number];

const MATRICE: Record<RoleSysteme, readonly Capacite[]> = {
  admin: [
    "parametres.gerer",
    "approbation.gerer",
    "entites.editer",
    "entites.voir",
    "commentaire.creer",
    "montants.voir",
  ],
  editeur: ["approbation.gerer", "entites.editer", "entites.voir", "commentaire.creer", "montants.voir"],
  contributeur: ["entites.editer", "entites.voir", "commentaire.creer"],
  lecteur: ["entites.voir", "commentaire.creer"],
};

export function aCapacite(role: RoleSysteme, capacite: Capacite): boolean {
  return MATRICE[role].includes(capacite);
}

export function capacitesDe(role: RoleSysteme): readonly Capacite[] {
  return MATRICE[role];
}

/** RG-R1 : toujours au moins un compte admin actif. */
export function estRoleValide(role: string): role is RoleSysteme {
  return (ROLES_SYSTEME as readonly string[]).includes(role);
}
