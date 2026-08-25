import { readdirSync, statSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "./env.js";
import { logger } from "./logger.js";

const execFileAsync = promisify(execFile);

/**
 * CDC v4, Lot 3.1 — connexion admin dédiée pour `pg_dump` (jamais `achirah_app`, dont la RLS
 * limiterait le contenu réellement sauvegardé à une seule organisation à la fois, voir `db/client.ts`).
 * Même variable que les migrations (`migrate.ts`) — un outil d'exploitation, pas le runtime applicatif.
 */
const connexionAdmin = process.env.DATABASE_URL_ADMIN ?? "postgres://postgres:postgres_dev_local_only@127.0.0.1:5432/achirah";

const RETENTION_MAX = 14;
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

function horodatage(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export interface Sauvegarde {
  nom: string;
  at: string;
  taille_octets: number;
}

/**
 * §8.1 — Sauvegarde réelle : `pg_dump` au format personnalisé (`-Fc`, compressé, restaurable
 * sélectivement par `pg_restore`) produit un instantané cohérent de la base (une seule transaction
 * snapshot, pas un `cp` de fichiers qui pourrait capturer un état incomplet), puis copie récursive
 * du dossier `uploads` — pas de dépendance externe d'archivage, chaque sauvegarde est un dossier
 * horodaté sous `BACKUPS_DIR`. Connexion admin (bypass RLS) : capture TOUTES les organisations,
 * jamais une seule (voir la constante `connexionAdmin` ci-dessus).
 */
export async function creerSauvegarde(): Promise<Sauvegarde> {
  const nom = `sauvegarde-${horodatage()}`;
  const dossier = join(env.backupsDir, nom);
  mkdirSync(dossier, { recursive: true });

  await execFileAsync("pg_dump", ["-Fc", "-f", join(dossier, "achirah.dump"), connexionAdmin]);
  if (existsSync(env.uploadsDir)) cpSync(env.uploadsDir, join(dossier, "uploads"), { recursive: true, force: true });

  await purgerAnciennesSauvegardes();
  const taille = tailleDossier(dossier);
  logger.info({ nom, taille_octets: taille }, "Sauvegarde créée");
  return { nom, at: new Date().toISOString(), taille_octets: taille };
}

function tailleDossier(chemin: string): number {
  let total = 0;
  for (const entree of readdirSync(chemin, { withFileTypes: true })) {
    const sousChemin = join(chemin, entree.name);
    total += entree.isDirectory() ? tailleDossier(sousChemin) : statSync(sousChemin).size;
  }
  return total;
}

export function listerSauvegardes(): Sauvegarde[] {
  mkdirSync(env.backupsDir, { recursive: true });
  return readdirSync(env.backupsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const chemin = join(env.backupsDir, e.name);
      return { nom: e.name, at: statSync(chemin).birthtime.toISOString(), taille_octets: tailleDossier(chemin) };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Conserve les `RETENTION_MAX` sauvegardes les plus récentes, supprime les plus anciennes. */
async function purgerAnciennesSauvegardes() {
  const toutes = listerSauvegardes();
  for (const ancienne of toutes.slice(RETENTION_MAX)) {
    rmSync(join(env.backupsDir, ancienne.nom), { recursive: true, force: true });
  }
}

let derniereSauvegardeAt: string | null = null;

/** Planificateur in-process (§8.1) : une sauvegarde immédiate au démarrage puis une par 24h glissantes. */
export function demarrerSauvegardeAutomatique() {
  const existantes = listerSauvegardes();
  derniereSauvegardeAt = existantes[0]?.at ?? null;

  async function tour() {
    const doitSauvegarder = !derniereSauvegardeAt || Date.now() - new Date(derniereSauvegardeAt).getTime() >= UN_JOUR_MS;
    if (doitSauvegarder) {
      try {
        const sauvegarde = await creerSauvegarde();
        derniereSauvegardeAt = sauvegarde.at;
      } catch (err) {
        logger.error({ err }, "Échec de la sauvegarde automatique");
      }
    }
  }
  void tour();
  setInterval(() => void tour(), UN_JOUR_MS);
}

export function derniereSauvegarde(): Sauvegarde | null {
  return listerSauvegardes()[0] ?? null;
}
