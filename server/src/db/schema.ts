import { pgTable, text, integer, real, boolean, jsonb, uuid as pgUuid, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  ChecklistItem,
  ScoreDetailDimension,
} from "@achirah/shared";

/**
 * Schéma Drizzle miroir exact des schémas Zod partagés (/shared).
 * Conventions (§4, conventions) : UUID v4, created_at/updated_at ISO texte, soft delete archived_at sauf mention,
 * colonnes JSON en jsonb pour les listes/objets imbriqués (tableaux, json libres).
 *
 * CDC v4, Lot 3.1 — PostgreSQL local (Drizzle) remplace SQLite. `created_at`/`updated_at`/les dates
 * métier restent des chaînes ISO en `text` (inchangé) : tout le code applicatif les compare déjà
 * comme des chaînes (tri lexicographique ISO 8601 correct) — retyper en `timestamp` natif aurait
 * cassé des dizaines de sites d'appel pour aucun gain fonctionnel dans ce lot. Les identifiants
 * passent en `uuid` natif Postgres (`gen_random_uuid()`), les booléens en `boolean` natif, les
 * colonnes JSON en `jsonb` — trois types que SQLite n'avait pas nativement et que Postgres gère mieux.
 *
 * CDC v4, Lot 3.2 — `organisation_id` sur chaque table métier (jamais sur `utilisateurs` — identité
 * globale multi-organisation — ni sur `sessions`, ni sur `organisations`/`membres` elles-mêmes, ni
 * sur `parametre_systeme` — portée globale assumée, voir DECISIONS.md Lot 3.5). Sa valeur par défaut
 * lit la variable de session Postgres `app.organisation_id` (posée par le middleware à chaque requête,
 * Lot 3.3) : aucun site d'appel n'a besoin de la fournir explicitement à l'écriture.
 */

const uuid = () => pgUuid("id").primaryKey().defaultRandom();

const isoNow = () => new Date().toISOString();
const timestamps = {
  created_at: text("created_at").notNull().$defaultFn(isoNow),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(isoNow)
    .$onUpdateFn(isoNow),
};
const archivable = { archived_at: text("archived_at") };
const bool = (name: string, def = false) => boolean(name).notNull().default(def);
const json = <T>(name: string) => jsonb(name).$type<T>();

/** RG-CFG5/Lot 3.3 : isolation multi-tenant par RLS — la valeur vient de `SET LOCAL app.organisation_id`. */
const orgId = () =>
  pgUuid("organisation_id")
    .notNull()
    .references(() => organisations.id)
    .default(sql`current_setting('app.organisation_id')::uuid`);

// ───────────────────────── Lot 3.2 — Organisations & appartenances ─────────────────────────

/** Le tenant. Pas de `organisation_id` sur elle-même — c'est l'unité de partitionnement. */
export const organisations = pgTable("organisations", {
  id: uuid(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
  ...timestamps,
}, (t) => ({ slugIdx: uniqueIndex("organisations_slug_idx").on(t.slug) }));

/**
 * Appartenance utilisateur↔organisation, avec le rôle système porté ici (et non plus sur
 * `utilisateurs`) — un compte est global, son rôle est propre à chaque organisation dont il est
 * membre. Pas de RLS dessus (voir `db/client.ts`) : la résolution de session doit pouvoir lire les
 * appartenances d'un utilisateur AVANT qu'une organisation « courante » soit connue.
 */
export const membres = pgTable("membres", {
  id: uuid(),
  utilisateur_id: pgUuid("utilisateur_id").notNull().references(() => utilisateurs.id),
  organisation_id: pgUuid("organisation_id").notNull().references(() => organisations.id),
  role_systeme: text("role_systeme").notNull(),
  ...timestamps,
}, (t) => ({ uniq: uniqueIndex("membres_utilisateur_organisation_idx").on(t.utilisateur_id, t.organisation_id) }));

// ───────────────────────── 4.1 Comptes & contacts ─────────────────────────

/** Identité globale — pas de `organisation_id` : un compte peut appartenir à plusieurs organisations (via `membres`). */
export const utilisateurs = pgTable("utilisateurs", {
  id: uuid(),
  email: text("email").notNull(),
  password_hash: text("password_hash").notNull(),
  nom: text("nom").notNull(),
  personne_id: pgUuid("personne_id").references((): any => personnes.id),
  langue: text("langue").notNull().default("fr"),
  ical_token: text("ical_token").notNull(),
  vue_board_preferee: text("vue_board_preferee").notNull().default("liste"),
  derniere_connexion: text("derniere_connexion"),
  echecs_login: integer("echecs_login").notNull().default(0),
  verrouille_jusqua: text("verrouille_jusqua"),
  ...timestamps,
}, (t) => ({
  emailIdx: uniqueIndex("utilisateurs_email_idx").on(t.email),
  icalIdx: uniqueIndex("utilisateurs_ical_idx").on(t.ical_token),
}));

/** Session liée à une organisation précise (celle active au moment du login, Lot 3.2/3.3). */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // token opaque
  utilisateur_id: pgUuid("utilisateur_id").notNull().references(() => utilisateurs.id),
  organisation_id: pgUuid("organisation_id").notNull().references(() => organisations.id),
  expires_at: text("expires_at").notNull(),
  created_at: text("created_at").notNull().$defaultFn(isoNow),
});

export const categoriesContact = pgTable("categories_contact", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  icone: text("icone"),
  systeme: bool("systeme"),
  ordre: integer("ordre").notNull().default(0),
}, (t) => ({ nomIdx: uniqueIndex("categories_contact_nom_idx").on(t.organisation_id, t.nom) }));

export const personnes = pgTable("personnes", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  categorie_ids: json<string[]>("categorie_ids").notNull().default([]),
  type: text("type").notNull(),
  telephone: text("telephone"),
  email: text("email"),
  instagram: text("instagram"),
  ville: text("ville"),
  tarif_jour_dt: real("tarif_jour_dt"),
  tarifs_prestations: json<{ prestation: string; tarif_dt: number }[]>("tarifs_prestations").notNull().default([]),
  tailles: json<Record<string, string | null | undefined>>("tailles").notNull().default({}),
  portfolio_url: text("portfolio_url"),
  book_asset_ids: json<string[]>("book_asset_ids").notNull().default([]),
  materiel: text("materiel"),
  styles: json<string[]>("styles").notNull().default([]),
  specialites: json<string[]>("specialites").notNull().default([]),
  delai_moyen_jours: integer("delai_moyen_jours"),
  moq_habituel: integer("moq_habituel"),
  conditions_paiement: text("conditions_paiement"),
  disponibilites: text("disponibilites"),
  note_5: real("note_5"),
  notes: text("notes"),
  actif: bool("actif", true),
  ...timestamps,
});

export const ambassadeurs = pgTable("ambassadeurs", {
  personne_id: pgUuid("personne_id").primaryKey().references(() => personnes.id),
  organisation_id: orgId(),
  code_promo: text("code_promo").notNull(),
  statut: text("statut").notNull(),
  pieces: json<{ article_sku_id: string }[]>("pieces").notNull().default([]),
  posts: json<{ date: string; lien: string; type: string }[]>("posts").notNull().default([]),
  ventes_attribuees_dt: real("ventes_attribuees_dt").notNull().default(0),
  notes: text("notes"),
}, (t) => ({ codePromoIdx: uniqueIndex("ambassadeurs_code_promo_idx").on(t.organisation_id, t.code_promo) }));

/** E32 — Fiche contact partagée : lien signé expirant, lecture seule, sans login. */
export const partagesPersonne = pgTable("partages_personne", {
  id: uuid(),
  organisation_id: orgId(),
  personne_id: pgUuid("personne_id").notNull().references(() => personnes.id),
  token: text("token").notNull(),
  expire_at: text("expire_at").notNull(),
  created_at: text("created_at").notNull().$defaultFn(isoNow),
}, (t) => ({ tokenIdx: uniqueIndex("partages_personne_token_idx").on(t.token) }));

// ───────────────────────── 4.2 Catalogue ─────────────────────────

export const articles = pgTable("articles", {
  id: uuid(),
  organisation_id: orgId(),
  reference: text("reference").notNull(),
  nom: text("nom").notNull(),
  gamme_id: pgUuid("gamme_id").notNull().references(() => gammes.id),
  categorie_id: pgUuid("categorie_id").notNull().references(() => categoriesProduit.id),
  chapitre_id: pgUuid("chapitre_id").references((): any => campagnes.id),
  fit: text("fit"),
  description_commerciale: text("description_commerciale"),
  composition: json<{ matiere_id: string; pct: number }[]>("composition").notNull().default([]),
  grammage_gsm: integer("grammage_gsm"),
  entretien_codes: json<string[]>("entretien_codes").notNull().default([]),
  numerote: bool("numerote"),
  numerotation_total: integer("numerotation_total"),
  fournisseur_id: pgUuid("fournisseur_id").references(() => personnes.id),
  delai_production_jours: integer("delai_production_jours"),
  moq: integer("moq"),
  statut_cycle: text("statut_cycle").notNull().default("idee"),
  notes_interne: text("notes_interne"),
  ...timestamps,
}, (t) => ({ referenceIdx: uniqueIndex("articles_reference_idx").on(t.organisation_id, t.reference) }));

export const articleColoris = pgTable("article_coloris", {
  id: uuid(),
  organisation_id: orgId(),
  article_id: pgUuid("article_id").notNull().references(() => articles.id),
  coloris_id: pgUuid("coloris_id").notNull().references(() => coloris.id),
  photos: json<string[]>("photos").notNull().default([]),
  prix_dt: real("prix_dt"),
  statut: text("statut").notNull().default("actif"),
  ordre: integer("ordre").notNull().default(0),
  ...timestamps,
});

export const articleSkus = pgTable("article_skus", {
  id: uuid(),
  organisation_id: orgId(),
  article_coloris_id: pgUuid("article_coloris_id").notNull().references(() => articleColoris.id),
  taille: text("taille").notNull(),
  qte_produite: integer("qte_produite").notNull().default(0),
  qte_stock: integer("qte_stock").notNull().default(0),
  mesures: json<Record<string, number>>("mesures").notNull().default({}),
  ...timestamps,
});

export const articleCouts = pgTable("article_couts", {
  article_id: pgUuid("article_id").primaryKey().references(() => articles.id),
  organisation_id: orgId(),
  tissu_dt: real("tissu_dt").notNull().default(0),
  faconnage_dt: real("faconnage_dt").notNull().default(0),
  fournitures_dt: real("fournitures_dt").notNull().default(0),
  packaging_dt: real("packaging_dt").notNull().default(0),
  transport_unitaire_dt: real("transport_unitaire_dt").notNull().default(0),
  autre_dt: real("autre_dt").notNull().default(0),
});

export const historiqueStatuts = pgTable("historique_statuts", {
  id: uuid(),
  organisation_id: orgId(),
  article_id: pgUuid("article_id").notNull().references(() => articles.id),
  de: text("de"),
  vers: text("vers").notNull(),
  at: text("at").notNull().$defaultFn(isoNow),
  par: pgUuid("par").notNull().references(() => utilisateurs.id),
});

// ───────────────────────── 4.3 Campagnes ─────────────────────────

export const campagnes = pgTable("campagnes", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  type_campagne_id: pgUuid("type_campagne_id").notNull().references(() => typesCampagne.id),
  occasion_id: pgUuid("occasion_id").references(() => listesParametrables.id),
  date_debut: text("date_debut").notNull(),
  date_fin: text("date_fin").notNull(),
  statut: text("statut").notNull().default("preparation"),
  objectif: text("objectif").notNull(),
  objectif_texte: text("objectif_texte"),
  description: text("description"),
  budget_total_dt: real("budget_total_dt").notNull().default(0),
  canaux: json<string[]>("canaux").notNull().default([]),
  kpi_cibles: json<Record<string, number>>("kpi_cibles").notNull().default({}),
  kpi_cibles_verrouillees: bool("kpi_cibles_verrouillees"),
  resultats: json<Record<string, unknown>>("resultats").notNull().default({}),
  rapport: json<{ marche: string; pas_marche: string; decisions: string } | null>("rapport"),
  ...timestamps,
});

export const campagneArticles = pgTable("campagne_articles", {
  id: uuid(),
  organisation_id: orgId(),
  campagne_id: pgUuid("campagne_id").notNull().references(() => campagnes.id),
  source: text("source").notNull(),
  article_coloris_id: pgUuid("article_coloris_id").references(() => articleColoris.id),
  url: text("url"),
  titre_extrait: text("titre_extrait"),
  image_extraite_url: text("image_extraite_url"),
  photo_asset_id: pgUuid("photo_asset_id").references((): any => assets.id),
  texte: text("texte"),
  ordre: integer("ordre").notNull().default(0),
  ...timestamps,
});

export const budgetLignes = pgTable("budget_lignes", {
  id: uuid(),
  organisation_id: orgId(),
  campagne_id: pgUuid("campagne_id").notNull().references(() => campagnes.id),
  poste_id: pgUuid("poste_id").notNull().references(() => listesParametrables.id),
  libelle: text("libelle").notNull(),
  prevu_dt: real("prevu_dt").notNull().default(0),
  engage_dt: real("engage_dt").notNull().default(0),
  reel_dt: real("reel_dt").notNull().default(0),
  personne_id: pgUuid("personne_id").references(() => personnes.id),
  justificatif_asset_id: pgUuid("justificatif_asset_id").references((): any => assets.id),
  ...timestamps,
});

// ───────────────────────── 4.4 Tâches & shootings ─────────────────────────

export const taches = pgTable("taches", {
  id: uuid(),
  organisation_id: orgId(),
  campagne_id: pgUuid("campagne_id").notNull().references(() => campagnes.id),
  // CDC v4, Lot 1.1 (RG-A10) : nullable — seules les tâches d'alerte lancement-production générées
  // automatiquement portent une référence directe à l'article concerné (clé d'idempotence).
  article_id: pgUuid("article_id").references(() => articles.id),
  titre: text("titre").notNull(),
  type: text("type").notNull(),
  date_echeance: text("date_echeance").notNull(),
  assigne_ids: json<string[]>("assigne_ids").notNull().default([]),
  lieu: text("lieu"),
  statut: text("statut").notNull().default("todo"),
  done_at: text("done_at"),
  description: text("description"),
  ...timestamps,
});

export const shootings = pgTable("shootings", {
  tache_id: pgUuid("tache_id").primaryKey().references(() => taches.id),
  organisation_id: orgId(),
  photographe_id: pgUuid("photographe_id").references(() => personnes.id),
  modele_ids: json<string[]>("modele_ids").notNull().default([]),
  decor: text("decor"),
  heure_lumiere: text("heure_lumiere"),
  duree_min: integer("duree_min").notNull().default(180),
  moodboard_board_id: pgUuid("moodboard_board_id").references((): any => boards.id),
  refs_visuelles: json<string[]>("refs_visuelles").notNull().default([]),
  autorisation_lieu: text("autorisation_lieu").notNull().default("non_requise"),
  autorisation_lieu_note: text("autorisation_lieu_note"),
  plan_b_lieu: text("plan_b_lieu"),
  grooming: text("grooming"),
  pieces: json<{ article_sku_id: string; note?: string }[]>("pieces").notNull().default([]),
  materiel: json<ChecklistItem[]>("materiel").notNull().default([]),
  preparation_pieces: json<ChecklistItem[]>("preparation_pieces").notNull().default([]),
  retour_pieces: json<{ article_sku_id: string; sort: string; garde_par_personne_id?: string }[]>(
    "retour_pieces",
  ).notNull().default([]),
  livrable_photos: text("livrable_photos"),
  livrable_videos: text("livrable_videos"),
  statut_post_prod: text("statut_post_prod").notNull().default("a_trier"),
  nb_photos_recues: integer("nb_photos_recues"),
  notes: text("notes"),
});

export const looks = pgTable("looks", {
  id: uuid(),
  organisation_id: orgId(),
  shooting_id: pgUuid("shooting_id").notNull().references(() => shootings.tache_id),
  nom: text("nom").notNull(),
  ordre: integer("ordre").notNull().default(0),
  note: text("note"),
});

export const lookItems = pgTable("look_items", {
  id: uuid(),
  organisation_id: orgId(),
  look_id: pgUuid("look_id").notNull().references(() => looks.id),
  slot: text("slot").notNull(),
  source: text("source").notNull(),
  article_coloris_id: pgUuid("article_coloris_id").references(() => articleColoris.id),
  photo_asset_id: pgUuid("photo_asset_id").references((): any => assets.id),
  texte: text("texte"),
  note: text("note"),
  taille: text("taille"),
  ordre: integer("ordre").notNull().default(0),
});

export const poses = pgTable("poses", {
  id: uuid(),
  organisation_id: orgId(),
  shooting_id: pgUuid("shooting_id").notNull().references(() => shootings.tache_id),
  ordre: integer("ordre").notNull().default(0),
  description: text("description").notNull(),
  article_coloris_id: pgUuid("article_coloris_id").references(() => articleColoris.id),
  look_id: pgUuid("look_id").references(() => looks.id),
  duree_min: integer("duree_min"),
});

// ───────────────────────── 4.5 Contenus, assets, boards, idées ─────────────────────────

export const contenus = pgTable("contenus", {
  id: uuid(),
  organisation_id: orgId(),
  campagne_id: pgUuid("campagne_id").notNull().references(() => campagnes.id),
  type: text("type").notNull(),
  plateformes: json<string[]>("plateformes").notNull().default([]),
  titre: text("titre").notNull(),
  caption: text("caption").notNull().default(""),
  registre_id: pgUuid("registre_id").references(() => registres.id),
  date_publication: text("date_publication"),
  statut: text("statut").notNull().default("brouillon"),
  asset_ids: json<string[]>("asset_ids").notNull().default([]),
  article_coloris_ids: json<string[]>("article_coloris_ids").notNull().default([]),
  auteur_id: pgUuid("auteur_id").notNull().references(() => utilisateurs.id),
  approbateur_id: pgUuid("approbateur_id").references(() => utilisateurs.id),
  publie_le: text("publie_le"),
  resultats: json<Record<string, number> | null>("resultats"),
  score_marque: real("score_marque"),
  score_detail: json<ScoreDetailDimension[] | null>("score_detail"),
  cree_par_agent: bool("cree_par_agent"),
  ...timestamps,
});

export const contenuVersions = pgTable("contenu_versions", {
  id: uuid(),
  organisation_id: orgId(),
  contenu_id: pgUuid("contenu_id").notNull().references(() => contenus.id),
  caption: text("caption").notNull(),
  at: text("at").notNull().$defaultFn(isoNow),
  par: pgUuid("par").notNull().references(() => utilisateurs.id),
});

export const assets = pgTable("assets", {
  id: uuid(),
  organisation_id: orgId(),
  type: text("type").notNull(),
  fichier_url: text("fichier_url").notNull(),
  vignette_url: text("vignette_url"),
  nom: text("nom").notNull(),
  tags: json<string[]>("tags").notNull().default([]),
  campagne_ids: json<string[]>("campagne_ids").notNull().default([]),
  article_coloris_ids: json<string[]>("article_coloris_ids").notNull().default([]),
  shooting_id: pgUuid("shooting_id").references(() => shootings.tache_id),
  createur_personne_ids: json<string[]>("createur_personne_ids").notNull().default([]),
  source: text("source").notNull(),
  droits: text("droits"),
  ...timestamps,
});

export const boards = pgTable("boards", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  campagne_id: pgUuid("campagne_id").references(() => campagnes.id),
  items: json<unknown[]>("items").notNull().default([]),
  ...timestamps,
});

export const idees = pgTable("idees", {
  id: uuid(),
  organisation_id: orgId(),
  contenu: text("contenu").notNull(),
  source: text("source").notNull(),
  article_coloris_id: pgUuid("article_coloris_id").references(() => articleColoris.id),
  tache_id: pgUuid("tache_id").references(() => taches.id),
  statut: text("statut").notNull().default("nouvelle"),
  score: real("score"),
  score_justification: text("score_justification"),
  ...timestamps,
});

// ───────────────────────── 4.7 GROW, tendances, veille, lexique, leçons ─────────────────────────

export const recommandations = pgTable("recommandations", {
  id: uuid(),
  organisation_id: orgId(),
  type: text("type").notNull(),
  titre: text("titre").notNull(),
  justification: text("justification").notNull(),
  source_donnees: json<{ libelle: string; valeur: string; date: string }[]>("source_donnees").notNull().default([]),
  impact: text("impact").notNull(),
  statut: text("statut").notNull().default("nouvelle"),
  ...timestamps,
});

export const tendances = pgTable("tendances", {
  id: uuid(),
  organisation_id: orgId(),
  source: text("source").notNull(),
  categorie: text("categorie").notNull(),
  titre: text("titre").notNull(),
  description: text("description").notNull(),
  lien: text("lien"),
  source_verifiee: bool("source_verifiee", true),
  scores: json<{ tunisia_fit: number; achirah_fit: number; audience_fit: number; maturite: string }>(
    "scores",
  ).notNull(),
  statut: text("statut").notNull().default("a_evaluer"),
  adaptation: text("adaptation"),
  ...timestamps,
});

export const concurrents = pgTable("concurrents", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  instagram: text("instagram"),
  segment: text("segment"),
  notes: text("notes"),
  ...timestamps,
});

export const relevesConcurrent = pgTable("releves_concurrent", {
  id: uuid(),
  organisation_id: orgId(),
  concurrent_id: pgUuid("concurrent_id").notNull().references(() => concurrents.id),
  date: text("date").notNull(),
  followers: integer("followers").notNull().default(0),
  posts_semaine: integer("posts_semaine").notNull().default(0),
  observation: text("observation"),
  lien: text("lien"),
});

export const expressions = pgTable("expressions", {
  id: uuid(),
  organisation_id: orgId(),
  texte: text("texte").notNull(),
  transliteration: text("transliteration"),
  registre_id: pgUuid("registre_id").notNull().references(() => registres.id),
  statut: text("statut").notNull().default("a_valider"),
  contexte_usage: text("contexte_usage"),
  exemple: text("exemple"),
  ajoutee_par: pgUuid("ajoutee_par").references(() => utilisateurs.id),
  validee_par: pgUuid("validee_par").references(() => utilisateurs.id),
  ...timestamps,
});

export const lecons = pgTable("lecons", {
  id: uuid(),
  organisation_id: orgId(),
  type: text("type").notNull(),
  texte: text("texte").notNull(),
  preuve: text("preuve"),
  campagne_id: pgUuid("campagne_id").references(() => campagnes.id),
  statut: text("statut").notNull().default("active"),
  injectee_agents: bool("injectee_agents", true),
  auteur_id: pgUuid("auteur_id").notNull().references(() => utilisateurs.id),
  fermetures_sans_reconfirmation: integer("fermetures_sans_reconfirmation").notNull().default(0),
  ...timestamps,
});

// ───────────────────────── 4.8 Mesure & intégrations ─────────────────────────

export const metriqueSnapshots = pgTable("metrique_snapshots", {
  id: uuid(),
  organisation_id: orgId(),
  plateforme: text("plateforme").notNull(),
  date: text("date").notNull(),
  kpis: json<Record<string, number>>("kpis").notNull().default({}),
  source: text("source").notNull().default("manuel"),
  campagne_id: pgUuid("campagne_id").references(() => campagnes.id),
});

export const integrations = pgTable("integrations", {
  id: uuid(),
  organisation_id: orgId(),
  plateforme: text("plateforme").notNull(),
  statut: text("statut").notNull().default("deconnectee"),
  credentials_chiffres: text("credentials_chiffres"),
  dernier_sync: text("dernier_sync"),
  frequence: text("frequence").notNull().default("quotidienne"),
  derniere_erreur: text("derniere_erreur"),
}, (t) => ({ plateformeIdx: uniqueIndex("integrations_plateforme_idx").on(t.organisation_id, t.plateforme) }));

/**
 * CDC v4, Lot 2.1 — centre de configuration in-app : un paramètre par clé (`ia.cle_api`,
 * `email.smtp_hote`, …), `chiffre` marque ceux passés par `lib/crypto.ts` (clé maîtresse serveur,
 * jamais renvoyés en clair — RG-CFG1).
 *
 * CDC v4, Lot 3.5 — reste volontairement SANS `organisation_id` : portée globale à l'instance, pas
 * par organisation. Le BYOK par organisation (mentionné dans le backlog SaaS, Couche 3) suppose un
 * modèle plan/abonnement qui n'existe pas encore (décision de prix bloquante, non tranchée) —
 * ajouter une portée par organisation maintenant aurait été une anticipation non demandée, sans le
 * mécanisme de quota qui la justifierait. Voir DECISIONS.md.
 */
export const parametresSysteme = pgTable("parametre_systeme", {
  id: uuid(),
  cle: text("cle").notNull(),
  valeur: text("valeur"),
  chiffre: bool("chiffre"),
  categorie: text("categorie").notNull(),
  modifie_par: pgUuid("modifie_par").references(() => utilisateurs.id),
  modifie_le: text("modifie_le").notNull().$defaultFn(isoNow).$onUpdateFn(isoNow),
}, (t) => ({ cleIdx: uniqueIndex("parametre_systeme_cle_idx").on(t.cle) }));

/**
 * CDC v4, Lot 3.4 — cache du brief quotidien externalisé du processus (remplace la variable module
 * `cacheBrief` en mémoire, incompatible avec plusieurs organisations/instances). Une ligne par
 * organisation, réécrite chaque jour.
 */
export const briefQuotidienCache = pgTable("brief_quotidien_cache", {
  organisation_id: pgUuid("organisation_id").primaryKey().references(() => organisations.id),
  date: text("date").notNull(),
  donnees: json<{ constats: string[]; actions: { titre: string; description: string }[] }>("donnees").notNull(),
});

// ───────────────────────── 4.9 Collaboration, notifications, audit, conversations ─────────────────────────

export const commentaires = pgTable("commentaires", {
  id: uuid(),
  organisation_id: orgId(),
  entite_type: text("entite_type").notNull(),
  entite_id: text("entite_id").notNull(),
  auteur_id: pgUuid("auteur_id").notNull().references(() => utilisateurs.id),
  contenu: text("contenu").notNull(),
  mentions: json<string[]>("mentions").notNull().default([]),
  resolu: bool("resolu"),
  retire: bool("retire"),
  created_at: text("created_at").notNull().$defaultFn(isoNow),
}, (t) => ({ entiteIdx: index("commentaires_entite_idx").on(t.entite_type, t.entite_id) }));

export const notifications = pgTable("notifications", {
  id: uuid(),
  organisation_id: orgId(),
  utilisateur_id: pgUuid("utilisateur_id").notNull().references(() => utilisateurs.id),
  type: text("type").notNull(),
  entite_type: text("entite_type").notNull(),
  entite_id: text("entite_id").notNull(),
  lu: bool("lu"),
  created_at: text("created_at").notNull().$defaultFn(isoNow),
}, (t) => ({ utilisateurIdx: index("notifications_utilisateur_idx").on(t.utilisateur_id) }));

export const reglagesNotification = pgTable("reglages_notification", {
  utilisateur_id: pgUuid("utilisateur_id").notNull().references(() => utilisateurs.id),
  type: text("type").notNull(),
  canaux: json<string[]>("canaux").notNull().default(["in_app"]),
}, (t) => ({ pk: primaryKey({ columns: [t.utilisateur_id, t.type] }) }));

export const audits = pgTable("audits", {
  id: uuid(),
  organisation_id: orgId(),
  utilisateur_id: pgUuid("utilisateur_id").notNull().references(() => utilisateurs.id),
  action: text("action").notNull(),
  entite_type: text("entite_type").notNull(),
  entite_id: text("entite_id"),
  avant: json<Record<string, unknown> | null>("avant"),
  apres: json<Record<string, unknown> | null>("apres"),
  via_agent: bool("via_agent"),
  conversation_id: pgUuid("conversation_id"),
  at: text("at").notNull().$defaultFn(isoNow),
}, (t) => ({ atIdx: index("audits_at_idx").on(t.at) }));

export const conversations = pgTable("conversations", {
  id: uuid(),
  organisation_id: orgId(),
  titre: text("titre").notNull().default(""),
  agent_id: pgUuid("agent_id").references((): any => agentsCampagne.id),
  utilisateur_id: pgUuid("utilisateur_id").notNull().references(() => utilisateurs.id),
  ...timestamps,
});

export const messages = pgTable("messages", {
  id: uuid(),
  organisation_id: orgId(),
  conversation_id: pgUuid("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  contenu: text("contenu").notNull(),
  images: json<string[]>("images").notNull().default([]),
  // Tokens réellement consommés (entrée+sortie) par ce message assistant — alimente le budget/jour
  // affiché en Paramètres (§6.1) ; null pour les messages utilisateur.
  tokens: integer("tokens"),
  created_at: text("created_at").notNull().$defaultFn(isoNow),
});

// ───────────────────────── 4.10 Agents ─────────────────────────

export const agentsCampagne = pgTable("agents_campagne", {
  id: uuid(),
  organisation_id: orgId(),
  campagne_id: pgUuid("campagne_id").references(() => campagnes.id),
  nom: text("nom").notNull(),
  avatar_couleur: text("avatar_couleur").notNull(),
  instructions: text("instructions").notNull().default(""),
  outils_actives: json<string[]>("outils_actives").notNull().default([]),
  actif: bool("actif", true),
  cree_par: pgUuid("cree_par").notNull().references(() => utilisateurs.id),
  ...timestamps,
});

/**
 * Outils d'écriture « carte de confirmation » (§6.4) : la proposition est persistée avant toute
 * écriture réelle — rien n'est écrit avant le tap de l'utilisateur. `groupe_id` réunit plusieurs
 * actions d'un même tour assistant en une seule carte (et une seule entrée d'audit groupée, RG-AGW5).
 */
export const actionsAgent = pgTable("actions_agent", {
  id: uuid(),
  organisation_id: orgId(),
  conversation_id: pgUuid("conversation_id").notNull().references(() => conversations.id),
  message_id: pgUuid("message_id").notNull().references(() => messages.id),
  groupe_id: text("groupe_id").notNull(),
  outil: text("outil").notNull(),
  entree: json<Record<string, unknown>>("entree").notNull(),
  avant: json<Record<string, unknown> | null>("avant"),
  apres_previsualise: json<Record<string, unknown> | null>("apres_previsualise"),
  statut: text("statut").notNull().default("en_attente"),
  utilisateur_id: pgUuid("utilisateur_id").notNull().references(() => utilisateurs.id),
  ...timestamps,
});

// ───────────────────────── Partie V — Référentiels (paramétrage, RG-PARAM2) ─────────────────────────

export const gammes = pgTable("gammes", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  code_prefixe: text("code_prefixe").notNull(),
  couleur: text("couleur"),
  alerte_baisse_prix: bool("alerte_baisse_prix"),
  message_alerte: text("message_alerte"),
  marge_cible_pct: real("marge_cible_pct").notNull().default(60),
  ordre: integer("ordre").notNull().default(0),
  ...archivable,
  ...timestamps,
}, (t) => ({ prefixeIdx: uniqueIndex("gammes_prefixe_idx").on(t.organisation_id, t.code_prefixe) }));

export const grillesTaille = pgTable("grilles_taille", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  valeurs: json<string[]>("valeurs").notNull().default([]),
  ...archivable,
  ...timestamps,
});

export const categoriesProduit = pgTable("categories_produit", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  slot_look: text("slot_look").notNull(),
  grille_tailles_id: pgUuid("grille_tailles_id").notNull().references(() => grillesTaille.id),
  grille_tailles_id_secondaire: pgUuid("grille_tailles_id_secondaire").references(() => grillesTaille.id),
  gabarit_mesures: text("gabarit_mesures").notNull(),
  ordre: integer("ordre").notNull().default(0),
  ...archivable,
  ...timestamps,
});

export const coloris = pgTable("coloris", {
  id: uuid(),
  organisation_id: orgId(),
  nom_commercial: text("nom_commercial").notNull(),
  code_3l: text("code_3l").notNull(),
  hex: text("hex").notNull(),
  ...archivable,
  ...timestamps,
}, (t) => ({ codeIdx: uniqueIndex("coloris_code_idx").on(t.organisation_id, t.code_3l) }));

export const matieres = pgTable("matieres", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  nom_ar: text("nom_ar"),
  note: text("note"),
  ...archivable,
  ...timestamps,
});

export const codesEntretien = pgTable("codes_entretien", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  icone: text("icone"),
  ordre: integer("ordre").notNull().default(0),
  ...archivable,
  ...timestamps,
});

/** Listes simples paramétrables : postes budgétaires, canaux, plateformes de contenu, occasions commerciales (§5.6). */
export const listesParametrables = pgTable("listes_parametrables", {
  id: uuid(),
  organisation_id: orgId(),
  categorie: text("categorie").notNull(), // 'poste_budgetaire' | 'canal' | 'plateforme_contenu' | 'occasion'
  nom: text("nom").notNull(),
  ordre: integer("ordre").notNull().default(0),
  ...archivable,
  ...timestamps,
}, (t) => ({ categorieIdx: index("listes_parametrables_categorie_idx").on(t.categorie) }));

export const modelesChecklist = pgTable("modeles_checklist", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  items: json<string[]>("items").notNull().default([]),
  ordre: integer("ordre").notNull().default(0),
  ...archivable,
  ...timestamps,
});

export const registres = pgTable("registres", {
  id: uuid(),
  organisation_id: orgId(),
  code: text("code").notNull(),
  nom: text("nom").notNull(),
  description: text("description").notNull().default(""),
  ordre: integer("ordre").notNull().default(0),
  ...archivable,
  ...timestamps,
});

export const typesCampagne = pgTable("types_campagne", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  modele_rituel_id: pgUuid("modele_rituel_id").references((): any => modelesRituel.id),
  ordre: integer("ordre").notNull().default(0),
  ...archivable,
  ...timestamps,
});

export const modelesRituel = pgTable("modeles_rituel", {
  id: uuid(),
  organisation_id: orgId(),
  nom: text("nom").notNull(),
  jalons: json<{ id: string; libelle: string; offset_jours: number; type_tache: string }[]>("jalons")
    .notNull()
    .default([]),
  ...archivable,
  ...timestamps,
});
