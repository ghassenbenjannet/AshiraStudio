import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { messageEnvoiSchema } from "@achirah/shared";
import { db } from "../db/client.js";
import { conversations, messages, actionsAgent } from "../db/schema.js";
import { erreurApi } from "../lib/http.js";
import { ErreurIaIndisponible } from "../lib/ia/fournisseur.js";
import { ErreurOutil } from "../services/ia/outils.js";
import { envoyerMessage, confirmerAction, annulerAction } from "../services/ia/boucle.js";
import type { AppEnv } from "../types.js";

export const conversationsRoutes = new Hono<AppEnv>();

const TOURS_MAX_CONVERSATION = 40; // §4.9

function gererErreurIa(c: any, err: unknown) {
  if (err instanceof ErreurIaIndisponible) return erreurApi(c, 503, "ia_indisponible", err.message);
  if (err instanceof ErreurOutil) return erreurApi(c, 403, err.code, err.message);
  throw err;
}

conversationsRoutes.get("/", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const lignes = await db.select().from(conversations).where(eq(conversations.utilisateur_id, utilisateur.id)).orderBy(desc(conversations.updated_at));
  return c.json({ donnees: lignes });
});

conversationsRoutes.get("/:id", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.utilisateur_id, utilisateur.id))).limit(1);
  if (!conversation) return erreurApi(c, 404, "introuvable", "Conversation introuvable");
  const listeMessages = await db.select().from(messages).where(eq(messages.conversation_id, id)).orderBy(messages.created_at);
  const actions = await db.select().from(actionsAgent).where(eq(actionsAgent.conversation_id, id));
  return c.json({ donnees: { ...conversation, messages: listeMessages, actions } });
});

const creerConversationSchema = z.object({ agent_id: z.string().uuid().nullable().optional() });
conversationsRoutes.post("/", zValidator("json", creerConversationSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const [cree] = (await db.insert(conversations).values({ titre: "", agent_id: c.req.valid("json").agent_id ?? null, utilisateur_id: utilisateur.id }).returning()) as any[];
  return c.json({ donnees: cree }, 201);
});

conversationsRoutes.delete("/:id", async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.utilisateur_id, utilisateur.id))).limit(1);
  if (!conversation) return erreurApi(c, 404, "introuvable", "Conversation introuvable");
  await db.delete(messages).where(eq(messages.conversation_id, id));
  await db.delete(actionsAgent).where(eq(actionsAgent.conversation_id, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  return c.body(null, 204);
});

conversationsRoutes.post("/:id/messages", zValidator("json", messageEnvoiSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const id = c.req.param("id");
  const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.utilisateur_id, utilisateur.id))).limit(1);
  if (!conversation) return erreurApi(c, 404, "introuvable", "Conversation introuvable");

  const nbToursActuels = (await db.select({ id: messages.id }).from(messages).where(and(eq(messages.conversation_id, id), eq(messages.role, "user")))).length;
  if (nbToursActuels >= TOURS_MAX_CONVERSATION) {
    return erreurApi(c, 422, "plafond_tours", `Cette conversation a atteint ${TOURS_MAX_CONVERSATION} tours — ouvrez une nouvelle conversation.`);
  }

  const corps = c.req.valid("json");
  try {
    const resultat = await envoyerMessage(id, corps.contenu, corps.images ?? [], { utilisateurId: utilisateur.id, role: utilisateur.role_systeme }, { agentId: corps.agent_id, campagneId: corps.campagne_id });
    return c.json({ donnees: resultat });
  } catch (err) {
    return gererErreurIa(c, err);
  }
});

const confirmerSchema = z.object({ entree: z.record(z.string(), z.unknown()).optional() });
conversationsRoutes.post("/:id/actions/:actionId/confirmer", zValidator("json", confirmerSchema), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  try {
    const resultat = await confirmerAction(c.req.param("actionId"), { utilisateurId: utilisateur.id, role: utilisateur.role_systeme }, c.req.valid("json").entree);
    return c.json({ donnees: resultat });
  } catch (err) {
    return gererErreurIa(c, err);
  }
});

conversationsRoutes.post("/:id/actions/:actionId/annuler", async (c) => {
  await annulerAction(c.req.param("actionId"));
  return c.body(null, 204);
});
