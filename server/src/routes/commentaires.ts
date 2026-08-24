import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { commentaireInsertSchema, aCapacite } from "@achirah/shared";
import { erreurApi } from "../lib/http.js";
import { enregistrerAudit } from "../lib/audit.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { listerCommentaires, creerCommentaire, resoudreCommentaire, retirerCommentaire, ErreurMetier } from "../services/commentaires.js";
import type { AppEnv } from "../types.js";

export const commentairesRoutes = new Hono<AppEnv>();

function gererErreurMetier(c: any, err: unknown) {
  if (err instanceof ErreurMetier) return erreurApi(c, err.status, err.code, err.message);
  throw err;
}

commentairesRoutes.get("/", async (c) => {
  const { entite_type, entite_id } = c.req.query();
  if (!entite_type || !entite_id) return erreurApi(c, 400, "parametres_manquants", "entite_type et entite_id requis");
  const lignes = await listerCommentaires(entite_type as any, entite_id);
  return c.json({ donnees: lignes });
});

commentairesRoutes.post("/", exigerCapacite("commentaire.creer"), zValidator("json", commentaireInsertSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const donnees = c.req.valid("json");
  const cree = await creerCommentaire({ entiteType: donnees.entite_type, entiteId: donnees.entite_id, contenu: donnees.contenu, auteurId: utilisateur.id });
  await enregistrerAudit({ utilisateurId: utilisateur.id, action: "commentaire.creer", entiteType: donnees.entite_type, entiteId: donnees.entite_id, apres: { commentaire_id: cree.id } });
  return c.json({ donnees: cree }, 201);
});

const resolutionSchema = z.object({ resolu: z.boolean() });
commentairesRoutes.patch("/:id/resolution", exigerCapacite("entites.editer"), zValidator("json", resolutionSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  try {
    const modifie = await resoudreCommentaire(c.req.param("id"), c.req.valid("json").resolu);
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "commentaire.resoudre", entiteType: "commentaire", entiteId: modifie.id, apres: { resolu: modifie.resolu } });
    return c.json({ donnees: modifie });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});

commentairesRoutes.post("/:id/retirer", exigerCapacite("commentaire.creer"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  try {
    const modifie = await retirerCommentaire(c.req.param("id"), utilisateur.id, aCapacite(utilisateur.role_systeme, "approbation.gerer"));
    await enregistrerAudit({ utilisateurId: utilisateur.id, action: "commentaire.retirer", entiteType: "commentaire", entiteId: modifie.id });
    return c.json({ donnees: modifie });
  } catch (err) {
    return gererErreurMetier(c, err);
  }
});
