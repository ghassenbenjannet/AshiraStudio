import { createMiddleware } from "hono/factory";
import { aCapacite, type Capacite } from "@achirah/shared";
import type { AppEnv } from "../types.js";

/**
 * RG-AGW2 : l'agent hérite exactement du RBAC de l'utilisateur qui parle, contrôlé côté serveur
 * à l'exécution de chaque outil — jamais dans le prompt. `verifierCapacite` est la fonction unique
 * utilisée à la fois par les routes HTTP classiques et par l'exécuteur d'outils agent (RG-PAR1a).
 */
export function verifierCapacite(roleSysteme: string, capacite: Capacite): boolean {
  return aCapacite(roleSysteme as any, capacite);
}

export function exigerCapacite(capacite: Capacite) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const utilisateur = c.get("utilisateur");
    if (!utilisateur) {
      return c.json({ error: { code: "non_authentifie", message: "Authentification requise" } }, 401);
    }
    if (!verifierCapacite(utilisateur.role_systeme, capacite)) {
      return c.json({ error: { code: "acces_refuse", message: "Permissions insuffisantes" } }, 403);
    }
    await next();
  });
}
