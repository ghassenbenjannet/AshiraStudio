import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env.js";

/** §8.3 — Credentials d'intégrations chiffrés AES-256-GCM, clé dérivée de la variable d'env serveur. */
const CLE = createHash("sha256").update(env.encryptionKey).digest();

export function chiffrer(texteClair: string): string {
  const iv = randomBytes(12);
  const chiffreur = createCipheriv("aes-256-gcm", CLE, iv);
  const chiffre = Buffer.concat([chiffreur.update(texteClair, "utf-8"), chiffreur.final()]);
  const balise = chiffreur.getAuthTag();
  return Buffer.concat([iv, balise, chiffre]).toString("base64");
}

export function dechiffrer(valeurChiffree: string): string {
  const donnees = Buffer.from(valeurChiffree, "base64");
  const iv = donnees.subarray(0, 12);
  const balise = donnees.subarray(12, 28);
  const chiffre = donnees.subarray(28);
  const dechiffreur = createDecipheriv("aes-256-gcm", CLE, iv);
  dechiffreur.setAuthTag(balise);
  return Buffer.concat([dechiffreur.update(chiffre), dechiffreur.final()]).toString("utf-8");
}
