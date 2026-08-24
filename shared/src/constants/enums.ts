/**
 * Statuts et workflows fixes dans le code (RG-PARAM1).
 * Les libellés affichés sont traduits via i18n — ces valeurs sont des clés stables, jamais affichées brutes.
 * Le vocabulaire de marque (gammes, registres, types de campagne, rituels) N'EST PAS ici : voir Partie V (référentiels en base).
 */

export const ROLES_SYSTEME = ["admin", "editeur", "contributeur", "lecteur"] as const;
export type RoleSysteme = (typeof ROLES_SYSTEME)[number];

export const LANGUES = ["fr", "ar"] as const;
export type Langue = (typeof LANGUES)[number];

export const VUE_BOARD = ["liste", "kanban", "calendrier"] as const;
export type VueBoard = (typeof VUE_BOARD)[number];

export const TYPE_PERSONNE = ["interne", "externe"] as const;
export type TypePersonne = (typeof TYPE_PERSONNE)[number];

export const STATUT_AMBASSADEUR = ["contacte", "confirme", "kit_envoye", "actif", "inactif"] as const;
export type StatutAmbassadeur = (typeof STATUT_AMBASSADEUR)[number];

export const FIT_ARTICLE = ["oversized", "boxy", "regular", "slim", "cropped", "ample"] as const;
export type FitArticle = (typeof FIT_ARTICLE)[number];

export const STATUT_CYCLE_ARTICLE = [
  "idee",
  "croquis",
  "prototype",
  "fit_valide",
  "production",
  "stock",
  "epuise",
  "archive",
] as const;
export type StatutCycleArticle = (typeof STATUT_CYCLE_ARTICLE)[number];

export const STATUT_ARTICLE_COLORIS = ["actif", "epuise"] as const;
export type StatutArticleColoris = (typeof STATUT_ARTICLE_COLORIS)[number];

export const GABARIT_MESURES = ["haut", "bas", "tete", "aucun"] as const;
export type GabaritMesures = (typeof GABARIT_MESURES)[number];

export const SLOT_LOOK = ["haut", "bas", "chaussures", "accessoire"] as const;
export type SlotLook = (typeof SLOT_LOOK)[number];

export const STATUT_CAMPAGNE = ["preparation", "active", "livree", "fermee", "abandonnee"] as const;
export type StatutCampagne = (typeof STATUT_CAMPAGNE)[number];

export const OBJECTIF_CAMPAGNE = ["notoriete", "ventes", "lancement", "communaute"] as const;
export type ObjectifCampagne = (typeof OBJECTIF_CAMPAGNE)[number];

export const SOURCE_CAMPAGNE_ARTICLE = ["catalogue", "lien", "photo", "texte"] as const;
export type SourceCampagneArticle = (typeof SOURCE_CAMPAGNE_ARTICLE)[number];

export const TYPE_TACHE = ["shooting", "contenu", "livraison", "paiement", "autre"] as const;
export type TypeTache = (typeof TYPE_TACHE)[number];

export const STATUT_TACHE = ["todo", "en_cours", "fait"] as const;
export type StatutTache = (typeof STATUT_TACHE)[number];

export const HEURE_LUMIERE = ["matin", "midi_dur", "golden_hour", "nuit", "studio"] as const;
export type HeureLumiere = (typeof HEURE_LUMIERE)[number];

export const AUTORISATION_LIEU = ["non_requise", "a_demander", "obtenue"] as const;
export type AutorisationLieu = (typeof AUTORISATION_LIEU)[number];

export const STATUT_POST_PROD = ["a_trier", "selection_faite", "retouche", "livre"] as const;
export type StatutPostProd = (typeof STATUT_POST_PROD)[number];

export const SORT_RETOUR_PIECE = ["rendu", "garde_par", "offert", "abime"] as const;
export type SortRetourPiece = (typeof SORT_RETOUR_PIECE)[number];

export const SOURCE_LOOK_ITEM = ["catalogue", "photo", "texte"] as const;
export type SourceLookItem = (typeof SOURCE_LOOK_ITEM)[number];

export const TYPE_CONTENU = ["post", "reel", "story", "tiktok", "carrousel", "email", "autre"] as const;
export type TypeContenu = (typeof TYPE_CONTENU)[number];

export const STATUT_CONTENU = ["brouillon", "en_revue", "approuve", "planifie", "publie", "archive"] as const;
export type StatutContenu = (typeof STATUT_CONTENU)[number];

export const TYPE_ASSET = ["photo", "video", "logo", "typo", "design", "ugc", "document"] as const;
export type TypeAsset = (typeof TYPE_ASSET)[number];

export const SOURCE_ASSET = ["shooting", "ugc", "externe", "studio"] as const;
export type SourceAsset = (typeof SOURCE_ASSET)[number];

export const TYPE_BOARD_ITEM = ["note", "image", "lien", "asset_ref"] as const;
export type TypeBoardItem = (typeof TYPE_BOARD_ITEM)[number];

export const SOURCE_IDEE = ["studio", "manuel", "generateur"] as const;
export type SourceIdee = (typeof SOURCE_IDEE)[number];

export const STATUT_IDEE = ["nouvelle", "utilisee", "ecartee"] as const;
export type StatutIdee = (typeof STATUT_IDEE)[number];

export const EFFORT_IDEE = ["facile", "moyen", "lourd"] as const;
export type EffortIdee = (typeof EFFORT_IDEE)[number];

export const TYPE_RECOMMANDATION = [
  "boost_creatif",
  "opportunite_contenu",
  "audience",
  "createur",
  "operationnel",
] as const;
export type TypeRecommandation = (typeof TYPE_RECOMMANDATION)[number];

export const IMPACT_RECOMMANDATION = ["haut", "moyen", "bas"] as const;
export type ImpactRecommandation = (typeof IMPACT_RECOMMANDATION)[number];

export const STATUT_RECOMMANDATION = ["nouvelle", "faite", "ignoree"] as const;
export type StatutRecommandation = (typeof STATUT_RECOMMANDATION)[number];

export const SOURCE_TENDANCE = ["manuelle", "studio_recherche"] as const;
export type SourceTendance = (typeof SOURCE_TENDANCE)[number];

export const CATEGORIE_TENDANCE = ["tunisie", "mode", "international"] as const;
export type CategorieTendance = (typeof CATEGORIE_TENDANCE)[number];

export const MATURITE_TENDANCE = ["emergente", "pic", "declin"] as const;
export type MaturiteTendance = (typeof MATURITE_TENDANCE)[number];

export const STATUT_TENDANCE = ["a_evaluer", "adoptee", "ecartee"] as const;
export type StatutTendance = (typeof STATUT_TENDANCE)[number];

export const STATUT_EXPRESSION = ["validee", "interdite", "a_valider"] as const;
export type StatutExpression = (typeof STATUT_EXPRESSION)[number];

export const TYPE_LECON = ["gagnant", "perdant", "regle_maison"] as const;
export type TypeLecon = (typeof TYPE_LECON)[number];

export const STATUT_LECON = ["active", "archivee"] as const;
export type StatutLecon = (typeof STATUT_LECON)[number];

export const PLATEFORME_INTEGRATION = ["meta", "tiktok", "ga4", "shopify"] as const;
export type PlateformeIntegration = (typeof PLATEFORME_INTEGRATION)[number];

export const STATUT_INTEGRATION = ["deconnectee", "connectee", "erreur"] as const;
export type StatutIntegration = (typeof STATUT_INTEGRATION)[number];

export const TYPE_NOTIFICATION = [
  "mention",
  "assignation",
  "approbation_demandee",
  "approbation_rendue",
  "echeance_j1",
  "retard",
  "rappel_publication",
  "rappel_veille",
  "rappel_retour_pieces",
  "rappel_kit_ambassadeur",
  "sync_erreur",
  "alerte_production",
] as const;
export type TypeNotification = (typeof TYPE_NOTIFICATION)[number];

export const ROLE_MESSAGE = ["user", "assistant"] as const;
export type RoleMessage = (typeof ROLE_MESSAGE)[number];

/** Entités pouvant porter un commentaire polymorphe (§4.9). */
export const ENTITES_COMMENTABLES = [
  "tache",
  "contenu",
  "asset",
  "campagne",
  "idee",
  "shooting",
  "article",
] as const;
export type EntiteCommentable = (typeof ENTITES_COMMENTABLES)[number];

export const DIMENSIONS_GATE = ["registre", "interdits", "specificite", "format", "coherence"] as const;
export type DimensionGate = (typeof DIMENSIONS_GATE)[number];
