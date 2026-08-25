import { eq, and } from "drizzle-orm";
import { aCapacite, type TypeNotification } from "@achirah/shared";
import { db } from "../db/client.js";
import { notifications, reglagesNotification, utilisateurs, membres } from "../db/schema.js";
import { logger } from "./logger.js";

/**
 * Tous les comptes dotés de `approbation.gerer` (admin/éditeur) DANS l'organisation donnée — utilisé
 * pour les notifications d'équipe sans destinataire unique naturel. `utilisateurs`/`membres` ne
 * portent pas de RLS (Lot 3.3) : la portée organisation doit être explicite ici, comme partout où
 * ces deux tables sont lues directement.
 */
export async function detenteursApprobation(organisationId: string): Promise<string[]> {
  const tous = await db
    .select({ id: utilisateurs.id, role_systeme: membres.role_systeme })
    .from(utilisateurs)
    .innerJoin(membres, and(eq(membres.utilisateur_id, utilisateurs.id), eq(membres.organisation_id, organisationId)));
  return tous.filter((u) => aCapacite(u.role_systeme as any, "approbation.gerer")).map((u) => u.id);
}

export interface CreerNotificationInput {
  utilisateurId: string;
  type: TypeNotification;
  entiteType: string;
  entiteId: string;
}

/**
 * §4.9 — Point d'entrée unique pour créer une notification. Le canal `in_app` est toujours honoré
 * (la ligne `notifications` fait foi pour la cloche). Les canaux `email`/`push` choisis par
 * l'utilisateur dans ses réglages sont honnêtement dégradés tant qu'aucun fournisseur SMTP/push
 * n'est configuré (RG-PROV : jamais de fausse confirmation d'envoi) — le choix est journalisé, pas
 * silencieusement ignoré.
 */
export async function creerNotification(input: CreerNotificationInput): Promise<void> {
  const [ligne] = (await db
    .insert(notifications)
    .values({ utilisateur_id: input.utilisateurId, type: input.type, entite_type: input.entiteType, entite_id: input.entiteId })
    .returning()) as (typeof notifications.$inferSelect)[];

  const [reglage] = await db
    .select()
    .from(reglagesNotification)
    .where(and(eq(reglagesNotification.utilisateur_id, input.utilisateurId), eq(reglagesNotification.type, input.type)))
    .limit(1);
  const canaux = reglage?.canaux ?? ["in_app"];

  if (canaux.includes("email")) {
    logger.info({ notification_id: ligne!.id, canal: "email" }, "Canal email choisi mais aucun fournisseur SMTP configuré — non livré");
  }
  if (canaux.includes("push")) {
    logger.info({ notification_id: ligne!.id, canal: "push" }, "Canal push choisi mais aucun abonnement Web Push enregistré — non livré");
  }
}

/** Extrait les @mentions d'un texte en les comparant au nom de chaque membre de l'organisation. */
export async function extraireMentions(contenu: string, organisationId: string): Promise<string[]> {
  const tousLesUtilisateurs = await db
    .select({ id: utilisateurs.id, nom: utilisateurs.nom })
    .from(utilisateurs)
    .innerJoin(membres, and(eq(membres.utilisateur_id, utilisateurs.id), eq(membres.organisation_id, organisationId)));
  const texteMinuscule = contenu.toLowerCase();
  return tousLesUtilisateurs.filter((u) => texteMinuscule.includes(`@${u.nom.toLowerCase()}`)).map((u) => u.id);
}
