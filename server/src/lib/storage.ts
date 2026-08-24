import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { env } from "./env.js";

/**
 * Service abstrait de stockage de fichiers (§8.1) : local aujourd'hui, chemin S3/R2 préservé —
 * un seul point à remplacer pour changer de backend.
 */
export interface FichierStocke {
  id: string;
  url: string;
}

// Whitelist volontairement stricte (§8.3, décision verrouillée) : jpeg/png/webp/csv/pdf ≤8 Mo.
// Les assets vidéo (type `video`) passent par une référence externe (source=externe, pas d'upload
// binaire) — cf. DECISIONS.md Phase ④.
const MIME_AUTORISES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "text/csv": ".csv",
  "application/pdf": ".pdf",
};

export const TAILLE_MAX_UPLOAD_OCTETS = 8 * 1024 * 1024; // 8 Mo (§8.3)

export function mimeAutorise(mime: string): boolean {
  return mime in MIME_AUTORISES;
}

export async function enregistrerFichier(donnees: Uint8Array, mime: string): Promise<FichierStocke> {
  if (!mimeAutorise(mime)) throw new Error(`Type de fichier non autorisé : ${mime}`);
  if (donnees.byteLength > TAILLE_MAX_UPLOAD_OCTETS) throw new Error("Fichier trop volumineux (max 8 Mo)");
  const id = randomUUID();
  const extension = MIME_AUTORISES[mime] ?? extname(mime);
  const nomFichier = `${id}${extension}`;
  await mkdir(env.uploadsDir, { recursive: true });
  await writeFile(join(env.uploadsDir, nomFichier), donnees);
  return { id, url: `/uploads/${nomFichier}` };
}
