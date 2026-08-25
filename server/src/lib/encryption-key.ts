import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

/**
 * CDC v4, Lot 2.2 — `ENCRYPTION_KEY` est l'une des deux seules exceptions qui restent hors du centre
 * de configuration (elle chiffre tout le reste — la stocker dans ce qu'elle chiffre annulerait le
 * chiffrement). Mais personne ne doit l'écrire à la main : si absente de l'environnement, générée
 * une fois (32 octets aléatoires), écrite dans un fichier local hors du dépôt (`/server/data/`,
 * déjà exclu par .gitignore, volume Docker persistant), permissions 600, avertissement affiché une
 * seule fois — à la génération, jamais aux démarrages suivants où le fichier existe déjà.
 */
const CHEMIN_CLE_DEFAUT = "./data/encryption.key";

export function obtenirOuGenererCleChiffrement(cheminFichier = process.env.ENCRYPTION_KEY_FILE ?? CHEMIN_CLE_DEFAUT): string {
  if (process.env.ENCRYPTION_KEY) return process.env.ENCRYPTION_KEY;

  if (existsSync(cheminFichier)) {
    return readFileSync(cheminFichier, "utf-8").trim();
  }

  mkdirSync(dirname(cheminFichier), { recursive: true });
  const cle = randomBytes(32).toString("hex");
  writeFileSync(cheminFichier, cle, { mode: 0o600 });
  chmodSync(cheminFichier, 0o600); // ceinture et bretelles : l'umask du process peut affaiblir le mode à la création.

  // console, pas le logger structuré (JSON) : ce message doit rester lisible tel quel dans les logs de démarrage.
  console.warn(
    `\n⚠️  Clé de chiffrement générée automatiquement (${cheminFichier}).\n` +
      "⚠️  Sauvegardez cette clé. Sans elle, tous les identifiants enregistrés deviennent irrécupérables.\n",
  );

  return cle;
}
