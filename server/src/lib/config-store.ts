import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { parametresSysteme } from "../db/schema.js";
import { chiffrer, dechiffrer } from "./crypto.js";
import { enregistrerAudit } from "./audit.js";

/**
 * CDC v4, Lot 2.1 — centre de configuration in-app. Registre déclaratif : source unique de vérité
 * pour savoir quelles clés existent, si elles sont chiffrées, à quelle catégorie (bloc d'écran)
 * elles appartiennent, et quelle variable d'environnement sert de valeur initiale acceptée pour un
 * déploiement automatisé (précédence base > variable d'environnement > défaut, §2.3).
 * `DATABASE_URL` et `ENCRYPTION_KEY` n'y figurent jamais (§2.2) — la base ne peut pas
 * se configurer elle-même, et la clé qui chiffre tout le reste ne peut pas être chiffrée par elle-même.
 */
export interface DefinitionParametre {
  chiffre: boolean;
  categorie: string;
  env?: string;
  defaut?: string;
}

export const REGISTRE_PARAMETRES: Record<string, DefinitionParametre> = {
  "ia.fournisseur": { chiffre: false, categorie: "ia", defaut: "anthropic" },
  "ia.modele_principal": { chiffre: false, categorie: "ia" },
  "ia.modele_leger": { chiffre: false, categorie: "ia" },
  "ia.cle_api": { chiffre: true, categorie: "ia" },
  "ia.base_url": { chiffre: false, categorie: "ia" },
  "ia.plafond_tokens_jour": { chiffre: false, categorie: "ia", env: "BUDGET_TOKENS_JOUR", defaut: "2000000" },

  "email.mode": { chiffre: false, categorie: "email", defaut: "smtp" },
  "email.smtp_hote": { chiffre: false, categorie: "email" },
  "email.smtp_port": { chiffre: false, categorie: "email", defaut: "587" },
  "email.smtp_utilisateur": { chiffre: false, categorie: "email" },
  "email.smtp_mot_de_passe": { chiffre: true, categorie: "email" },
  "email.smtp_tls": { chiffre: false, categorie: "email", defaut: "true" },
  "email.expediteur": { chiffre: false, categorie: "email" },
  "email.service_nom": { chiffre: false, categorie: "email" },
  "email.service_cle_api": { chiffre: true, categorie: "email" },

  "push.vapid_cle_publique": { chiffre: false, categorie: "push" },
  "push.vapid_cle_privee": { chiffre: true, categorie: "push" },
  "push.contact_email": { chiffre: false, categorie: "push" },

  "stockage.mode": { chiffre: false, categorie: "stockage", defaut: "local" },
  "stockage.endpoint": { chiffre: false, categorie: "stockage" },
  "stockage.bucket": { chiffre: false, categorie: "stockage" },
  "stockage.region": { chiffre: false, categorie: "stockage" },
  "stockage.cle_acces": { chiffre: true, categorie: "stockage" },
  "stockage.cle_secrete": { chiffre: true, categorie: "stockage" },

  "supervision.sentry_dsn": { chiffre: true, categorie: "supervision" },
  "supervision.niveau_logs": { chiffre: false, categorie: "supervision", defaut: "info" },

  "sauvegardes.dossier": { chiffre: false, categorie: "sauvegardes", env: "BACKUPS_DIR", defaut: "./backups" },
  "sauvegardes.heure": { chiffre: false, categorie: "sauvegardes", defaut: "03:00" },
  "sauvegardes.retention_jours": { chiffre: false, categorie: "sauvegardes", defaut: "14" },
};

export type CategorieParametre = (typeof REGISTRE_PARAMETRES)[keyof typeof REGISTRE_PARAMETRES]["categorie"];

let cache: Map<string, string> | null = null;

/** Rechargement à chaud (§2.3) : toute écriture invalide le cache, la valeur suivante est relue de la base. */
export function invaliderCacheParametres(): void {
  cache = null;
}

async function chargerCache(): Promise<Map<string, string>> {
  if (cache) return cache;
  const lignes = await db.select().from(parametresSysteme);
  const carte = new Map<string, string>();
  for (const ligne of lignes) {
    if (ligne.valeur === null) continue;
    carte.set(ligne.cle, ligne.chiffre ? dechiffrer(ligne.valeur) : ligne.valeur);
  }
  cache = carte;
  return carte;
}

/** Précédence base > variable d'environnement > défaut (§2.3). */
export async function lireParametre(cle: string): Promise<string | null> {
  const carte = await chargerCache();
  if (carte.has(cle)) return carte.get(cle)!;
  const definition = REGISTRE_PARAMETRES[cle];
  if (definition?.env && process.env[definition.env]) return process.env[definition.env]!;
  return definition?.defaut ?? null;
}

export async function lireParametres(cles: string[]): Promise<Record<string, string | null>> {
  const resultat: Record<string, string | null> = {};
  for (const cle of cles) resultat[cle] = await lireParametre(cle);
  return resultat;
}

/** `valeur === null` efface le paramètre (retombe sur l'env/le défaut). RG-CFG3 : l'audit ne porte jamais la valeur. */
export async function ecrireParametre(cle: string, valeur: string | null, utilisateurId: string): Promise<void> {
  const definition = REGISTRE_PARAMETRES[cle];
  if (!definition) throw new Error(`Paramètre inconnu : ${cle}`);

  if (valeur === null) {
    await db.delete(parametresSysteme).where(eq(parametresSysteme.cle, cle));
  } else {
    const valeurStockee = definition.chiffre ? chiffrer(valeur) : valeur;
    const maintenant = new Date().toISOString();
    await db
      .insert(parametresSysteme)
      .values({ cle, valeur: valeurStockee, chiffre: definition.chiffre, categorie: definition.categorie, modifie_par: utilisateurId, modifie_le: maintenant })
      .onConflictDoUpdate({ target: parametresSysteme.cle, set: { valeur: valeurStockee, modifie_par: utilisateurId, modifie_le: maintenant } });
  }

  invaliderCacheParametres();
  await enregistrerAudit({ utilisateurId, action: valeur === null ? "parametre.effacer" : "parametre.modifier", entiteType: "parametre_systeme", entiteId: cle });
}

/** `sk-abc…4f2a` — RG-CFG1 : un secret n'est jamais renvoyé en clair au client. */
export function masquerSecret(valeur: string | null): string | null {
  if (!valeur) return null;
  return valeur.length <= 4 ? "••••" : `••••${valeur.slice(-4)}`;
}
