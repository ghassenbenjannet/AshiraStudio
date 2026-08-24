import { eq, and, desc } from "drizzle-orm";
import type { EntiteCommentable } from "@achirah/shared";
import { db } from "../db/client.js";
import { commentaires } from "../db/schema.js";
import { creerNotification, extraireMentions } from "../lib/notifications.js";

/** §4.9, RG-CO1 : un commentaire n'est jamais supprimé, seulement marqué « retiré ». */
export class ErreurMetier extends Error {
  constructor(
    public status: 404 | 422 | 403,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function listerCommentaires(entiteType: EntiteCommentable, entiteId: string) {
  return db
    .select()
    .from(commentaires)
    .where(and(eq(commentaires.entite_type, entiteType), eq(commentaires.entite_id, entiteId)))
    .orderBy(desc(commentaires.created_at));
}

export async function creerCommentaire(input: { entiteType: EntiteCommentable; entiteId: string; contenu: string; auteurId: string }) {
  const mentions = await extraireMentions(input.contenu);
  const [cree] = (await db
    .insert(commentaires)
    .values({ entite_type: input.entiteType, entite_id: input.entiteId, contenu: input.contenu, auteur_id: input.auteurId, mentions })
    .returning()) as (typeof commentaires.$inferSelect)[];

  for (const utilisateurId of mentions) {
    if (utilisateurId === input.auteurId) continue;
    await creerNotification({ utilisateurId, type: "mention", entiteType: input.entiteType, entiteId: input.entiteId });
  }

  return cree!;
}

export async function resoudreCommentaire(id: string, resolu: boolean) {
  const [ligne] = await db.select().from(commentaires).where(eq(commentaires.id, id)).limit(1);
  if (!ligne) throw new ErreurMetier(404, "introuvable", "Commentaire introuvable");
  const [modifie] = (await db.update(commentaires).set({ resolu }).where(eq(commentaires.id, id)).returning()) as (typeof commentaires.$inferSelect)[];
  return modifie!;
}

/** RG-CO1 : retirer n'efface jamais la ligne — `contenu` est remplacé par un texte fixe côté front, la donnée reste auditable. */
export async function retirerCommentaire(id: string, utilisateurId: string, peutModererAutrui: boolean) {
  const [ligne] = await db.select().from(commentaires).where(eq(commentaires.id, id)).limit(1);
  if (!ligne) throw new ErreurMetier(404, "introuvable", "Commentaire introuvable");
  if (ligne.auteur_id !== utilisateurId && !peutModererAutrui) {
    throw new ErreurMetier(403, "acces_refuse", "Seul l'auteur peut retirer son commentaire");
  }
  const [modifie] = (await db.update(commentaires).set({ retire: true }).where(eq(commentaires.id, id)).returning()) as (typeof commentaires.$inferSelect)[];
  return modifie!;
}
