import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, utilisateurs } from "../db/schema.js";
import {
  SESSION_DUREE_JOURS,
  VERROUILLAGE_APRES_ECHECS,
  VERROUILLAGE_DUREE_MIN,
  type Utilisateur,
} from "@achirah/shared";

/** Ne renvoie jamais password_hash / champs de verrouillage internes au client. */
export function versUtilisateurPublic(row: typeof utilisateurs.$inferSelect): Utilisateur {
  const { password_hash: _password_hash, echecs_login: _echecs_login, verrouille_jusqua: _verrouille_jusqua, ...publicRow } = row;
  return publicRow as Utilisateur;
}

export async function hashMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 12);
}

export async function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}

export function genererToken(longueur = 48): string {
  return randomBytes(longueur).toString("base64url");
}

/** Token ICS 32 caractères exactement (§4.6), régénérable. */
export function genererIcalToken(): string {
  return randomBytes(16).toString("hex");
}

export const SESSION_COOKIE = "achirah_session";
export const SESSION_MAX_AGE_SEC = SESSION_DUREE_JOURS * 24 * 60 * 60;

export async function creerSession(utilisateurId: string): Promise<string> {
  const token = genererToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString();
  await db.insert(sessions).values({ id: token, utilisateur_id: utilisateurId, expires_at: expiresAt });
  return token;
}

export async function detruireSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export async function utilisateurDeSession(token: string) {
  const rows = await db
    .select()
    .from(sessions)
    .innerJoin(utilisateurs, eq(sessions.utilisateur_id, utilisateurs.id))
    .where(eq(sessions.id, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.sessions.expires_at) < new Date()) {
    await detruireSession(token);
    return null;
  }
  return versUtilisateurPublic(row.utilisateurs);
}

/** Verrouillage 15 min après 5 échecs (§2.1). */
export async function enregistrerEchecLogin(utilisateurId: string, echecsActuels: number): Promise<void> {
  const echecs = echecsActuels + 1;
  const verrouilleJusqua =
    echecs >= VERROUILLAGE_APRES_ECHECS
      ? new Date(Date.now() + VERROUILLAGE_DUREE_MIN * 60 * 1000).toISOString()
      : null;
  await db
    .update(utilisateurs)
    .set({ echecs_login: verrouilleJusqua ? 0 : echecs, verrouille_jusqua: verrouilleJusqua })
    .where(eq(utilisateurs.id, utilisateurId));
}

export async function reinitialiserEchecsLogin(utilisateurId: string): Promise<void> {
  await db
    .update(utilisateurs)
    .set({ echecs_login: 0, verrouille_jusqua: null, derniere_connexion: new Date().toISOString() })
    .where(eq(utilisateurs.id, utilisateurId));
}

export function estVerrouille(verrouilleJusqua: string | null): boolean {
  return !!verrouilleJusqua && new Date(verrouilleJusqua) > new Date();
}
