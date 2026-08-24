import { z } from "zod";
import { baseEntitySchema } from "./common.js";

/** §4.10 — Agent de campagne (ou standard global si campagne_id null). */
export const agentCampagneSchema = baseEntitySchema.extend({
  campagne_id: z.string().uuid().nullable(),
  nom: z.string().min(1).max(60),
  avatar_couleur: z.string().min(1),
  instructions: z.string().max(4000),
  outils_actives: z.array(z.string()).default([]),
  actif: z.boolean().default(true),
  cree_par: z.string().uuid(),
});
export type AgentCampagne = z.infer<typeof agentCampagneSchema>;
export const agentCampagneInsertSchema = agentCampagneSchema.omit({ id: true, created_at: true, updated_at: true });
export const agentCampagneUpdateSchema = agentCampagneInsertSchema.partial();
