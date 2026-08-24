import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { boards, campagnes, campagneArticles } from "../db/schema.js";
import { enregistrerAudit } from "../lib/audit.js";
import type { BoardItem, ObjectifCampagne } from "@achirah/shared";

export class ErreurMetier extends Error {
  code: string;
  status: 400 | 404 | 422;
  constructor(status: 400 | 404 | 422, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function obtenirOuEchouer(id: string) {
  const [board] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
  if (!board) throw new ErreurMetier(404, "introuvable", "Board introuvable");
  return board;
}

export async function ajouterItem(boardId: string, item: Omit<BoardItem, "id">, utilisateurId: string) {
  const board = await obtenirOuEchouer(boardId);
  const nouvel: BoardItem = { ...item, id: randomUUID() };
  const items = [...(board.items as BoardItem[]), nouvel];
  const [modifie] = (await db.update(boards).set({ items }).where(eq(boards.id, boardId)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "board.ajouter_item", entiteType: "board", entiteId: boardId, apres: { item: nouvel } });
  return modifie;
}

export async function modifierItem(boardId: string, itemId: string, patch: Partial<Omit<BoardItem, "id">>, utilisateurId: string) {
  const board = await obtenirOuEchouer(boardId);
  const items = (board.items as BoardItem[]).map((it) => (it.id === itemId ? { ...it, ...patch } : it));
  if (!items.some((it) => it.id === itemId)) throw new ErreurMetier(404, "introuvable", "Item introuvable");
  const [modifie] = (await db.update(boards).set({ items }).where(eq(boards.id, boardId)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "board.modifier_item", entiteType: "board", entiteId: boardId, apres: { item_id: itemId, patch } });
  return modifie;
}

export async function supprimerItem(boardId: string, itemId: string, utilisateurId: string) {
  const board = await obtenirOuEchouer(boardId);
  const items = (board.items as BoardItem[]).filter((it) => it.id !== itemId);
  const [modifie] = (await db.update(boards).set({ items }).where(eq(boards.id, boardId)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "board.supprimer_item", entiteType: "board", entiteId: boardId, avant: { item_id: itemId } });
  return modifie;
}

export interface EntreeTransformerEnCampagne {
  item_ids: string[];
  nom: string;
  type_campagne_id: string;
  date_debut: string;
  date_fin: string;
  objectif: ObjectifCampagne;
}

/** « Transformer en campagne » (§4.5) : notes → stratégie (description), images/asset_ref → assets rattachés. */
export async function transformerEnCampagne(boardId: string, entree: EntreeTransformerEnCampagne, utilisateurId: string) {
  const board = await obtenirOuEchouer(boardId);
  const selection = (board.items as BoardItem[]).filter((it) => entree.item_ids.includes(it.id));
  if (selection.length === 0) throw new ErreurMetier(422, "selection_vide", "Sélectionnez au moins un item du board");

  const notes = selection.filter((it) => it.type === "note").map((it) => it.contenu).join("\n\n");
  const [campagne] = (await db
    .insert(campagnes)
    .values({
      nom: entree.nom,
      type_campagne_id: entree.type_campagne_id,
      date_debut: entree.date_debut,
      date_fin: entree.date_fin,
      objectif: entree.objectif,
      description: notes || null,
      statut: "preparation",
    })
    .returning()) as any[];

  const imagesEtAssets = selection.filter((it) => it.type === "image" || it.type === "asset_ref");
  for (const [index, item] of imagesEtAssets.entries()) {
    await db.insert(campagneArticles).values({ campagne_id: campagne.id, source: "photo", photo_asset_id: item.contenu, ordre: index });
  }

  await enregistrerAudit({ utilisateurId, action: "board.transformer_en_campagne", entiteType: "campagne", entiteId: campagne.id, apres: { depuis_board: boardId, item_ids: entree.item_ids } });
  return campagne;
}
