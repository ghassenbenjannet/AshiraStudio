/**
 * Source unique des patterns partagés front/back (§8.1) : référence article, grilles.
 */

/** `{prefixe}-NN` — prefixe = code_prefixe de la gamme (2-3 lettres), NN = 2 chiffres. Validation bloquante (RG-A1). */
export const REFERENCE_ARTICLE_REGEX = /^[A-Z]{2,3}-\d{2}$/;

/** Code prefixe de gamme : 2-3 lettres majuscules. */
export const CODE_PREFIXE_GAMME_REGEX = /^[A-Z]{2,3}$/;

/** Code coloris 3 lettres majuscules. */
export const CODE_COLORIS_REGEX = /^[A-Z]{3}$/;

/** Couleur hex `#rrggbb`. */
export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function buildReferenceArticle(prefixeGamme: string, numero: number): string {
  return `${prefixeGamme}-${String(numero).padStart(2, "0")}`;
}

/** SKU affiché : `SG-01-NOI-42` = référence article + code coloris + taille (§4.2). */
export function buildSkuAffiche(referenceArticle: string, codeColoris: string, taille: string): string {
  return `${referenceArticle}-${codeColoris}-${taille}`;
}

export const TOKEN_ICAL_LENGTH = 32;

export const MOTS_DE_PASSE_LONGUEUR_MIN = 8;
export const VERROUILLAGE_APRES_ECHECS = 5;
export const VERROUILLAGE_DUREE_MIN = 15;
export const SESSION_DUREE_JOURS = 30;

export const SEUIL_GATE_MARQUE = 7; // /10 (§6.6)
export const MARGE_SEUIL_ORANGE_DEFAUT = 45;
export const MARGE_SEUIL_VERT_DEFAUT = 60;

export const PLAFOND_MESSAGES_HEURE = 30; // §6.1
export const PLAFOND_ECRITURES_AGENT_TOUR = 10; // RG-AGW4
export const PLAFOND_ECRITURES_AGENT_JOUR = 100; // RG-AGW4
export const PLAFOND_TOURS_CONVERSATION = 40; // §4.9
export const PLAFOND_RECOMMANDATIONS_ACTIVES = 5; // RG-G1
export const PLAFOND_LECONS_INJECTEES = 20; // RG-LC2

export const FUSEAU_CALCUL = "Africa/Tunis";
