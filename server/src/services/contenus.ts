import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { contenus, contenuVersions, assets } from "../db/schema.js";
import { enregistrerAudit } from "../lib/audit.js";
import { noterContenu } from "./ia/generation.js";
import { ErreurIaIndisponible } from "../lib/anthropic.js";
import { creerNotification, detenteursApprobation } from "../lib/notifications.js";

export class ErreurMetier extends Error {
  code: string;
  status: 400 | 404 | 409 | 422;
  constructor(status: 400 | 404 | 409 | 422, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function obtenirOuEchouer(id: string) {
  const [contenu] = await db.select().from(contenus).where(eq(contenus.id, id)).limit(1);
  if (!contenu) throw new ErreurMetier(404, "introuvable", "Contenu introuvable");
  return contenu;
}

/** RG-AS1 : un asset UGC sans `droits` rempli bloque l'approbation du contenu qui l'utilise. */
async function verifierGateAssetsUgc(assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return;
  const lignes = await db.select().from(assets).where(inArray(assets.id, assetIds));
  const bloquants = lignes.filter((a) => a.source === "ugc" && !a.droits);
  if (bloquants.length > 0) {
    throw new ErreurMetier(
      422,
      "droits_ugc_manquants",
      `Approbation bloquée (RG-AS1) : renseignez le champ « droits » de ${bloquants.length === 1 ? "l'asset UGC" : "ces assets UGC"} : ${bloquants.map((a) => a.nom).join(", ")}`,
    );
  }
}

/** Snapshot la légende courante avant modification, si le contenu a déjà quitté `brouillon` (§4.5). */
export async function snapshotVersionSiNecessaire(contenuId: string, utilisateurId: string): Promise<void> {
  const contenu = await obtenirOuEchouer(contenuId);
  if (contenu.statut === "brouillon") return;
  await db.insert(contenuVersions).values({ contenu_id: contenuId, caption: contenu.caption, par: utilisateurId });
}

export async function soumettreContenu(id: string, utilisateurId: string) {
  const contenu = await obtenirOuEchouer(id);
  if (contenu.statut !== "brouillon") throw new ErreurMetier(422, "transition_invalide", "Seul un contenu brouillon peut être soumis");
  if (!contenu.caption.trim() && contenu.asset_ids.length === 0) {
    throw new ErreurMetier(422, "caption_ou_asset_requis", "Une légende ou au moins un asset est requis avant révision");
  }
  const [modifie] = (await db.update(contenus).set({ statut: "en_revue" }).where(eq(contenus.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.soumettre", entiteType: "contenu", entiteId: id, avant: { statut: contenu.statut }, apres: { statut: "en_revue" } });

  for (const destinataireId of await detenteursApprobation()) {
    if (destinataireId === utilisateurId) continue;
    await creerNotification({ utilisateurId: destinataireId, type: "approbation_demandee", entiteType: "contenu", entiteId: id });
  }

  // Gate auto affiché en revue (scénario recette 8) — jamais bloquant : panne IA = soumission
  // manuelle inchangée (scénario 6, RG-PAR1d), le score reste simplement absent.
  try {
    const { score_marque, score_detail } = await noterContenu(id, utilisateurId);
    return { ...modifie, score_marque, score_detail };
  } catch (err) {
    if (err instanceof ErreurIaIndisponible) return modifie;
    throw err;
  }
}

export async function approuverContenu(id: string, utilisateurId: string) {
  const contenu = await obtenirOuEchouer(id);
  if (contenu.statut !== "en_revue") throw new ErreurMetier(422, "transition_invalide", "Seul un contenu en révision peut être approuvé");
  await verifierGateAssetsUgc(contenu.asset_ids);
  const [modifie] = (await db
    .update(contenus)
    .set({ statut: "approuve", approbateur_id: utilisateurId })
    .where(eq(contenus.id, id))
    .returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.approuver", entiteType: "contenu", entiteId: id, avant: { statut: contenu.statut }, apres: { statut: "approuve" } });
  if (contenu.auteur_id !== utilisateurId) {
    await creerNotification({ utilisateurId: contenu.auteur_id, type: "approbation_rendue", entiteType: "contenu", entiteId: id });
  }
  return modifie;
}

export async function planifierContenu(id: string, datePublication: string, utilisateurId: string) {
  const contenu = await obtenirOuEchouer(id);
  if (contenu.statut !== "approuve") throw new ErreurMetier(422, "transition_invalide", "Seul un contenu approuvé peut être planifié");
  const [modifie] = (await db
    .update(contenus)
    .set({ statut: "planifie", date_publication: datePublication })
    .where(eq(contenus.id, id))
    .returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.planifier", entiteType: "contenu", entiteId: id, avant: { statut: contenu.statut }, apres: { statut: "planifie", date_publication: datePublication } });
  return modifie;
}

/** Coche manuelle (EX2) — la publication effective se fait par un humain sur la plateforme. */
export async function publierContenu(id: string, utilisateurId: string) {
  const contenu = await obtenirOuEchouer(id);
  if (contenu.statut !== "planifie") throw new ErreurMetier(422, "transition_invalide", "Seul un contenu planifié peut être marqué publié");
  const publieLe = new Date().toISOString();
  const [modifie] = (await db.update(contenus).set({ statut: "publie", publie_le: publieLe }).where(eq(contenus.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.publier", entiteType: "contenu", entiteId: id, avant: { statut: contenu.statut }, apres: { statut: "publie", publie_le: publieLe } });
  return modifie;
}

export async function archiverContenu(id: string, utilisateurId: string) {
  const contenu = await obtenirOuEchouer(id);
  if (!["approuve", "planifie", "publie"].includes(contenu.statut)) {
    throw new ErreurMetier(422, "transition_invalide", "Seul un contenu approuvé, planifié ou publié peut être archivé");
  }
  const [modifie] = (await db.update(contenus).set({ statut: "archive" }).where(eq(contenus.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.archiver", entiteType: "contenu", entiteId: id, avant: { statut: contenu.statut }, apres: { statut: "archive" } });
  return modifie;
}

/** Déclinaison multi-plateforme en 1 tap : copie brouillon indépendante. */
export async function dupliquerContenu(id: string, utilisateurId: string, plateformes?: string[]) {
  const contenu = await obtenirOuEchouer(id);
  const [copie] = (await db
    .insert(contenus)
    .values({
      campagne_id: contenu.campagne_id,
      type: contenu.type,
      plateformes: plateformes ?? contenu.plateformes,
      titre: `${contenu.titre} (copie)`,
      caption: contenu.caption,
      registre_id: contenu.registre_id,
      asset_ids: contenu.asset_ids,
      article_coloris_ids: contenu.article_coloris_ids,
      auteur_id: utilisateurId,
      statut: "brouillon",
    })
    .returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.dupliquer", entiteType: "contenu", entiteId: copie.id, apres: copie });
  return copie;
}

export async function restaurerVersion(contenuId: string, versionId: string, utilisateurId: string) {
  const contenu = await obtenirOuEchouer(contenuId);
  const [version] = await db.select().from(contenuVersions).where(eq(contenuVersions.id, versionId)).limit(1);
  if (!version || version.contenu_id !== contenuId) throw new ErreurMetier(404, "introuvable", "Version introuvable");
  await snapshotVersionSiNecessaire(contenuId, utilisateurId);
  const [modifie] = (await db.update(contenus).set({ caption: version.caption }).where(eq(contenus.id, contenuId)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "contenu.restaurer_version", entiteType: "contenu", entiteId: contenuId, avant: { caption: contenu.caption }, apres: { caption: version.caption } });
  return modifie;
}
