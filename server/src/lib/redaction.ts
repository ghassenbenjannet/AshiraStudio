import { aCapacite, type RoleSysteme } from "@achirah/shared";

/** RG-R2 : montants (budgets, tarifs, COGS, marges) masqués à contributeur/lecteur. */
export function peutVoirMontants(role: RoleSysteme): boolean {
  return aCapacite(role, "montants.voir");
}

export function redigerMontantsPersonne<T extends { tarif_jour_dt?: unknown; tarifs_prestations?: unknown; conditions_paiement?: unknown }>(
  personne: T,
  role: RoleSysteme,
): T {
  if (peutVoirMontants(role)) return personne;
  return { ...personne, tarif_jour_dt: null, tarifs_prestations: [], conditions_paiement: null };
}
