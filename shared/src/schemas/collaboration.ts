import { z } from "zod";
import { ENTITES_COMMENTABLES, TYPE_NOTIFICATION, ROLE_MESSAGE } from "../constants/enums.js";

/** §4.9 — Commentaire polymorphe. Jamais supprimé (RG-CO1), marqué "message retiré". */
export const commentaireSchema = z.object({
  id: z.string().uuid(),
  entite_type: z.enum(ENTITES_COMMENTABLES),
  entite_id: z.string().uuid(),
  auteur_id: z.string().uuid(),
  contenu: z.string().min(1).max(2000),
  mentions: z.array(z.string().uuid()).default([]),
  resolu: z.boolean().default(false),
  retire: z.boolean().default(false),
  created_at: z.string().datetime({ offset: true }),
});
export type Commentaire = z.infer<typeof commentaireSchema>;
export const commentaireInsertSchema = z.object({
  entite_type: z.enum(ENTITES_COMMENTABLES),
  entite_id: z.string().uuid(),
  contenu: z.string().min(1).max(2000),
});

const canalNotificationSchema = z.enum(["in_app", "email", "push"]);
export type CanalNotification = z.infer<typeof canalNotificationSchema>;

export const notificationSchema = z.object({
  id: z.string().uuid(),
  utilisateur_id: z.string().uuid(),
  type: z.enum(TYPE_NOTIFICATION),
  entite_type: z.string(),
  entite_id: z.string().uuid(),
  lu: z.boolean().default(false),
  created_at: z.string().datetime({ offset: true }),
});
export type Notification = z.infer<typeof notificationSchema>;

/** Matrice de réglage par utilisateur x type x canal. */
export const reglageNotificationSchema = z.object({
  utilisateur_id: z.string().uuid(),
  type: z.enum(TYPE_NOTIFICATION),
  canaux: z.array(canalNotificationSchema),
});
export type ReglageNotification = z.infer<typeof reglageNotificationSchema>;

/** §4.9 — Audit. Couvre toutes les écritures sensibles + écritures d'agents. */
export const auditSchema = z.object({
  id: z.string().uuid(),
  utilisateur_id: z.string().uuid(),
  action: z.string().min(1),
  entite_type: z.string().min(1),
  entite_id: z.string().uuid().nullable().optional(),
  avant: z.record(z.string(), z.unknown()).nullable().optional(),
  apres: z.record(z.string(), z.unknown()).nullable().optional(),
  via_agent: z.boolean().default(false),
  conversation_id: z.string().uuid().nullable().optional(),
  at: z.string().datetime({ offset: true }),
});
export type Audit = z.infer<typeof auditSchema>;

export const conversationSchema = z.object({
  id: z.string().uuid(),
  titre: z.string().max(60),
  agent_id: z.string().uuid().nullable().optional(),
  utilisateur_id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  role: z.enum(ROLE_MESSAGE),
  contenu: z.string(),
  images: z.array(z.string().uuid()).max(4).default([]), // asset_ids — jamais de base64 en base
  created_at: z.string().datetime({ offset: true }),
});
export type Message = z.infer<typeof messageSchema>;
export const messageEnvoiSchema = z.object({
  contenu: z.string().min(1),
  images: z.array(z.string().uuid()).max(4).optional(),
  campagne_id: z.string().uuid().optional(), // chip de contexte
  agent_id: z.string().uuid().optional(),
});
