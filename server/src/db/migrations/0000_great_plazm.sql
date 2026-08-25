CREATE TABLE IF NOT EXISTS "actions_agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"groupe_id" text NOT NULL,
	"outil" text NOT NULL,
	"entree" jsonb NOT NULL,
	"avant" jsonb,
	"apres_previsualise" jsonb,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents_campagne" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"campagne_id" uuid,
	"nom" text NOT NULL,
	"avatar_couleur" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"outils_actives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"cree_par" uuid NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ambassadeurs" (
	"personne_id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"code_promo" text NOT NULL,
	"statut" text NOT NULL,
	"pieces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"posts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ventes_attribuees_dt" real DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_coloris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"coloris_id" uuid NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prix_dt" real,
	"statut" text DEFAULT 'actif' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_couts" (
	"article_id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"tissu_dt" real DEFAULT 0 NOT NULL,
	"faconnage_dt" real DEFAULT 0 NOT NULL,
	"fournitures_dt" real DEFAULT 0 NOT NULL,
	"packaging_dt" real DEFAULT 0 NOT NULL,
	"transport_unitaire_dt" real DEFAULT 0 NOT NULL,
	"autre_dt" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"article_coloris_id" uuid NOT NULL,
	"taille" text NOT NULL,
	"qte_produite" integer DEFAULT 0 NOT NULL,
	"qte_stock" integer DEFAULT 0 NOT NULL,
	"mesures" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"reference" text NOT NULL,
	"nom" text NOT NULL,
	"gamme_id" uuid NOT NULL,
	"categorie_id" uuid NOT NULL,
	"chapitre_id" uuid,
	"fit" text,
	"description_commerciale" text,
	"composition" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"grammage_gsm" integer,
	"entretien_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"numerote" boolean DEFAULT false NOT NULL,
	"numerotation_total" integer,
	"fournisseur_id" uuid,
	"delai_production_jours" integer,
	"moq" integer,
	"statut_cycle" text DEFAULT 'idee' NOT NULL,
	"notes_interne" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"type" text NOT NULL,
	"fichier_url" text NOT NULL,
	"vignette_url" text,
	"nom" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"campagne_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"article_coloris_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shooting_id" uuid,
	"createur_personne_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text NOT NULL,
	"droits" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entite_type" text NOT NULL,
	"entite_id" text,
	"avant" jsonb,
	"apres" jsonb,
	"via_agent" boolean DEFAULT false NOT NULL,
	"conversation_id" uuid,
	"at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"campagne_id" uuid,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brief_quotidien_cache" (
	"organisation_id" uuid PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"donnees" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_lignes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"campagne_id" uuid NOT NULL,
	"poste_id" uuid NOT NULL,
	"libelle" text NOT NULL,
	"prevu_dt" real DEFAULT 0 NOT NULL,
	"engage_dt" real DEFAULT 0 NOT NULL,
	"reel_dt" real DEFAULT 0 NOT NULL,
	"personne_id" uuid,
	"justificatif_asset_id" uuid,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campagne_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"campagne_id" uuid NOT NULL,
	"source" text NOT NULL,
	"article_coloris_id" uuid,
	"url" text,
	"titre_extrait" text,
	"image_extraite_url" text,
	"photo_asset_id" uuid,
	"texte" text,
	"ordre" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campagnes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"type_campagne_id" uuid NOT NULL,
	"occasion_id" uuid,
	"date_debut" text NOT NULL,
	"date_fin" text NOT NULL,
	"statut" text DEFAULT 'preparation' NOT NULL,
	"objectif" text NOT NULL,
	"objectif_texte" text,
	"description" text,
	"budget_total_dt" real DEFAULT 0 NOT NULL,
	"canaux" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"kpi_cibles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"kpi_cibles_verrouillees" boolean DEFAULT false NOT NULL,
	"resultats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rapport" jsonb,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"icone" text,
	"systeme" boolean DEFAULT false NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories_produit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"slot_look" text NOT NULL,
	"grille_tailles_id" uuid NOT NULL,
	"grille_tailles_id_secondaire" uuid,
	"gabarit_mesures" text NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codes_entretien" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"icone" text,
	"ordre" integer DEFAULT 0 NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coloris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom_commercial" text NOT NULL,
	"code_3l" text NOT NULL,
	"hex" text NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commentaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"entite_type" text NOT NULL,
	"entite_id" text NOT NULL,
	"auteur_id" uuid NOT NULL,
	"contenu" text NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resolu" boolean DEFAULT false NOT NULL,
	"retire" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concurrents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"instagram" text,
	"segment" text,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contenu_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"contenu_id" uuid NOT NULL,
	"caption" text NOT NULL,
	"at" text NOT NULL,
	"par" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contenus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"campagne_id" uuid NOT NULL,
	"type" text NOT NULL,
	"plateformes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"titre" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"registre_id" uuid,
	"date_publication" text,
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"article_coloris_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auteur_id" uuid NOT NULL,
	"approbateur_id" uuid,
	"publie_le" text,
	"resultats" jsonb,
	"score_marque" real,
	"score_detail" jsonb,
	"cree_par_agent" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"titre" text DEFAULT '' NOT NULL,
	"agent_id" uuid,
	"utilisateur_id" uuid NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"texte" text NOT NULL,
	"transliteration" text,
	"registre_id" uuid NOT NULL,
	"statut" text DEFAULT 'a_valider' NOT NULL,
	"contexte_usage" text,
	"exemple" text,
	"ajoutee_par" uuid,
	"validee_par" uuid,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gammes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"code_prefixe" text NOT NULL,
	"couleur" text,
	"alerte_baisse_prix" boolean DEFAULT false NOT NULL,
	"message_alerte" text,
	"marge_cible_pct" real DEFAULT 60 NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grilles_taille" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"valeurs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "historique_statuts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"de" text,
	"vers" text NOT NULL,
	"at" text NOT NULL,
	"par" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "idees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"contenu" text NOT NULL,
	"source" text NOT NULL,
	"article_coloris_id" uuid,
	"tache_id" uuid,
	"statut" text DEFAULT 'nouvelle' NOT NULL,
	"score" real,
	"score_justification" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"plateforme" text NOT NULL,
	"statut" text DEFAULT 'deconnectee' NOT NULL,
	"credentials_chiffres" text,
	"dernier_sync" text,
	"frequence" text DEFAULT 'quotidienne' NOT NULL,
	"derniere_erreur" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lecons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"type" text NOT NULL,
	"texte" text NOT NULL,
	"preuve" text,
	"campagne_id" uuid,
	"statut" text DEFAULT 'active' NOT NULL,
	"injectee_agents" boolean DEFAULT true NOT NULL,
	"auteur_id" uuid NOT NULL,
	"fermetures_sans_reconfirmation" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listes_parametrables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"categorie" text NOT NULL,
	"nom" text NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "look_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"look_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"source" text NOT NULL,
	"article_coloris_id" uuid,
	"photo_asset_id" uuid,
	"texte" text,
	"note" text,
	"taille" text,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "looks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"shooting_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matieres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"nom_ar" text,
	"note" text,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"role_systeme" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"contenu" text NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tokens" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metrique_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"plateforme" text NOT NULL,
	"date" text NOT NULL,
	"kpis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'manuel' NOT NULL,
	"campagne_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modeles_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modeles_rituel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"jalons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"type" text NOT NULL,
	"entite_type" text NOT NULL,
	"entite_id" text NOT NULL,
	"lu" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parametre_systeme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cle" text NOT NULL,
	"valeur" text,
	"chiffre" boolean DEFAULT false NOT NULL,
	"categorie" text NOT NULL,
	"modifie_par" uuid,
	"modifie_le" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partages_personne" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"personne_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expire_at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personnes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"categorie_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"type" text NOT NULL,
	"telephone" text,
	"email" text,
	"instagram" text,
	"ville" text,
	"tarif_jour_dt" real,
	"tarifs_prestations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tailles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"portfolio_url" text,
	"book_asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"materiel" text,
	"styles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specialites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delai_moyen_jours" integer,
	"moq_habituel" integer,
	"conditions_paiement" text,
	"disponibilites" text,
	"note_5" real,
	"notes" text,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"shooting_id" uuid NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"article_coloris_id" uuid,
	"look_id" uuid,
	"duree_min" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommandations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"type" text NOT NULL,
	"titre" text NOT NULL,
	"justification" text NOT NULL,
	"source_donnees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"impact" text NOT NULL,
	"statut" text DEFAULT 'nouvelle' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"code" text NOT NULL,
	"nom" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reglages_notification" (
	"utilisateur_id" uuid NOT NULL,
	"type" text NOT NULL,
	"canaux" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	CONSTRAINT "reglages_notification_utilisateur_id_type_pk" PRIMARY KEY("utilisateur_id","type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "releves_concurrent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"concurrent_id" uuid NOT NULL,
	"date" text NOT NULL,
	"followers" integer DEFAULT 0 NOT NULL,
	"posts_semaine" integer DEFAULT 0 NOT NULL,
	"observation" text,
	"lien" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shootings" (
	"tache_id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"photographe_id" uuid,
	"modele_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decor" text,
	"heure_lumiere" text,
	"duree_min" integer DEFAULT 180 NOT NULL,
	"moodboard_board_id" uuid,
	"refs_visuelles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"autorisation_lieu" text DEFAULT 'non_requise' NOT NULL,
	"autorisation_lieu_note" text,
	"plan_b_lieu" text,
	"grooming" text,
	"pieces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"materiel" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preparation_pieces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retour_pieces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"livrable_photos" text,
	"livrable_videos" text,
	"statut_post_prod" text DEFAULT 'a_trier' NOT NULL,
	"nb_photos_recues" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"campagne_id" uuid NOT NULL,
	"article_id" uuid,
	"titre" text NOT NULL,
	"type" text NOT NULL,
	"date_echeance" text NOT NULL,
	"assigne_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lieu" text,
	"statut" text DEFAULT 'todo' NOT NULL,
	"done_at" text,
	"description" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tendances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"source" text NOT NULL,
	"categorie" text NOT NULL,
	"titre" text NOT NULL,
	"description" text NOT NULL,
	"lien" text,
	"source_verifiee" boolean DEFAULT true NOT NULL,
	"scores" jsonb NOT NULL,
	"statut" text DEFAULT 'a_evaluer' NOT NULL,
	"adaptation" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "types_campagne" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid DEFAULT current_setting('app.organisation_id')::uuid NOT NULL,
	"nom" text NOT NULL,
	"modele_rituel_id" uuid,
	"ordre" integer DEFAULT 0 NOT NULL,
	"archived_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "utilisateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nom" text NOT NULL,
	"personne_id" uuid,
	"langue" text DEFAULT 'fr' NOT NULL,
	"ical_token" text NOT NULL,
	"vue_board_preferee" text DEFAULT 'liste' NOT NULL,
	"derniere_connexion" text,
	"echecs_login" integer DEFAULT 0 NOT NULL,
	"verrouille_jusqua" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions_agent" ADD CONSTRAINT "actions_agent_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions_agent" ADD CONSTRAINT "actions_agent_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions_agent" ADD CONSTRAINT "actions_agent_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions_agent" ADD CONSTRAINT "actions_agent_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents_campagne" ADD CONSTRAINT "agents_campagne_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents_campagne" ADD CONSTRAINT "agents_campagne_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents_campagne" ADD CONSTRAINT "agents_campagne_cree_par_utilisateurs_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ambassadeurs" ADD CONSTRAINT "ambassadeurs_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ambassadeurs" ADD CONSTRAINT "ambassadeurs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_coloris" ADD CONSTRAINT "article_coloris_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_coloris" ADD CONSTRAINT "article_coloris_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_coloris" ADD CONSTRAINT "article_coloris_coloris_id_coloris_id_fk" FOREIGN KEY ("coloris_id") REFERENCES "public"."coloris"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_couts" ADD CONSTRAINT "article_couts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_couts" ADD CONSTRAINT "article_couts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_skus" ADD CONSTRAINT "article_skus_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_skus" ADD CONSTRAINT "article_skus_article_coloris_id_article_coloris_id_fk" FOREIGN KEY ("article_coloris_id") REFERENCES "public"."article_coloris"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_gamme_id_gammes_id_fk" FOREIGN KEY ("gamme_id") REFERENCES "public"."gammes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_categorie_id_categories_produit_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories_produit"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_chapitre_id_campagnes_id_fk" FOREIGN KEY ("chapitre_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_fournisseur_id_personnes_id_fk" FOREIGN KEY ("fournisseur_id") REFERENCES "public"."personnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_shooting_id_shootings_tache_id_fk" FOREIGN KEY ("shooting_id") REFERENCES "public"."shootings"("tache_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audits" ADD CONSTRAINT "audits_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audits" ADD CONSTRAINT "audits_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boards" ADD CONSTRAINT "boards_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boards" ADD CONSTRAINT "boards_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "brief_quotidien_cache" ADD CONSTRAINT "brief_quotidien_cache_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_lignes" ADD CONSTRAINT "budget_lignes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_lignes" ADD CONSTRAINT "budget_lignes_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_lignes" ADD CONSTRAINT "budget_lignes_poste_id_listes_parametrables_id_fk" FOREIGN KEY ("poste_id") REFERENCES "public"."listes_parametrables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_lignes" ADD CONSTRAINT "budget_lignes_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_lignes" ADD CONSTRAINT "budget_lignes_justificatif_asset_id_assets_id_fk" FOREIGN KEY ("justificatif_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campagne_articles" ADD CONSTRAINT "campagne_articles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campagne_articles" ADD CONSTRAINT "campagne_articles_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campagne_articles" ADD CONSTRAINT "campagne_articles_article_coloris_id_article_coloris_id_fk" FOREIGN KEY ("article_coloris_id") REFERENCES "public"."article_coloris"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campagne_articles" ADD CONSTRAINT "campagne_articles_photo_asset_id_assets_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campagnes" ADD CONSTRAINT "campagnes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campagnes" ADD CONSTRAINT "campagnes_type_campagne_id_types_campagne_id_fk" FOREIGN KEY ("type_campagne_id") REFERENCES "public"."types_campagne"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campagnes" ADD CONSTRAINT "campagnes_occasion_id_listes_parametrables_id_fk" FOREIGN KEY ("occasion_id") REFERENCES "public"."listes_parametrables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories_contact" ADD CONSTRAINT "categories_contact_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories_produit" ADD CONSTRAINT "categories_produit_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories_produit" ADD CONSTRAINT "categories_produit_grille_tailles_id_grilles_taille_id_fk" FOREIGN KEY ("grille_tailles_id") REFERENCES "public"."grilles_taille"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories_produit" ADD CONSTRAINT "categories_produit_grille_tailles_id_secondaire_grilles_taille_id_fk" FOREIGN KEY ("grille_tailles_id_secondaire") REFERENCES "public"."grilles_taille"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "codes_entretien" ADD CONSTRAINT "codes_entretien_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coloris" ADD CONSTRAINT "coloris_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_auteur_id_utilisateurs_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "concurrents" ADD CONSTRAINT "concurrents_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenu_versions" ADD CONSTRAINT "contenu_versions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenu_versions" ADD CONSTRAINT "contenu_versions_contenu_id_contenus_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenus"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenu_versions" ADD CONSTRAINT "contenu_versions_par_utilisateurs_id_fk" FOREIGN KEY ("par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenus" ADD CONSTRAINT "contenus_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenus" ADD CONSTRAINT "contenus_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenus" ADD CONSTRAINT "contenus_registre_id_registres_id_fk" FOREIGN KEY ("registre_id") REFERENCES "public"."registres"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenus" ADD CONSTRAINT "contenus_auteur_id_utilisateurs_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contenus" ADD CONSTRAINT "contenus_approbateur_id_utilisateurs_id_fk" FOREIGN KEY ("approbateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_campagne_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents_campagne"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expressions" ADD CONSTRAINT "expressions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expressions" ADD CONSTRAINT "expressions_registre_id_registres_id_fk" FOREIGN KEY ("registre_id") REFERENCES "public"."registres"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expressions" ADD CONSTRAINT "expressions_ajoutee_par_utilisateurs_id_fk" FOREIGN KEY ("ajoutee_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expressions" ADD CONSTRAINT "expressions_validee_par_utilisateurs_id_fk" FOREIGN KEY ("validee_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gammes" ADD CONSTRAINT "gammes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grilles_taille" ADD CONSTRAINT "grilles_taille_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_par_utilisateurs_id_fk" FOREIGN KEY ("par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idees" ADD CONSTRAINT "idees_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idees" ADD CONSTRAINT "idees_article_coloris_id_article_coloris_id_fk" FOREIGN KEY ("article_coloris_id") REFERENCES "public"."article_coloris"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idees" ADD CONSTRAINT "idees_tache_id_taches_id_fk" FOREIGN KEY ("tache_id") REFERENCES "public"."taches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lecons" ADD CONSTRAINT "lecons_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lecons" ADD CONSTRAINT "lecons_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lecons" ADD CONSTRAINT "lecons_auteur_id_utilisateurs_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listes_parametrables" ADD CONSTRAINT "listes_parametrables_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "look_items" ADD CONSTRAINT "look_items_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "look_items" ADD CONSTRAINT "look_items_look_id_looks_id_fk" FOREIGN KEY ("look_id") REFERENCES "public"."looks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "look_items" ADD CONSTRAINT "look_items_article_coloris_id_article_coloris_id_fk" FOREIGN KEY ("article_coloris_id") REFERENCES "public"."article_coloris"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "look_items" ADD CONSTRAINT "look_items_photo_asset_id_assets_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "looks" ADD CONSTRAINT "looks_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "looks" ADD CONSTRAINT "looks_shooting_id_shootings_tache_id_fk" FOREIGN KEY ("shooting_id") REFERENCES "public"."shootings"("tache_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matieres" ADD CONSTRAINT "matieres_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membres" ADD CONSTRAINT "membres_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membres" ADD CONSTRAINT "membres_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "metrique_snapshots" ADD CONSTRAINT "metrique_snapshots_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "metrique_snapshots" ADD CONSTRAINT "metrique_snapshots_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "modeles_checklist" ADD CONSTRAINT "modeles_checklist_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "modeles_rituel" ADD CONSTRAINT "modeles_rituel_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parametre_systeme" ADD CONSTRAINT "parametre_systeme_modifie_par_utilisateurs_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partages_personne" ADD CONSTRAINT "partages_personne_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partages_personne" ADD CONSTRAINT "partages_personne_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personnes" ADD CONSTRAINT "personnes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poses" ADD CONSTRAINT "poses_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poses" ADD CONSTRAINT "poses_shooting_id_shootings_tache_id_fk" FOREIGN KEY ("shooting_id") REFERENCES "public"."shootings"("tache_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poses" ADD CONSTRAINT "poses_article_coloris_id_article_coloris_id_fk" FOREIGN KEY ("article_coloris_id") REFERENCES "public"."article_coloris"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poses" ADD CONSTRAINT "poses_look_id_looks_id_fk" FOREIGN KEY ("look_id") REFERENCES "public"."looks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommandations" ADD CONSTRAINT "recommandations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registres" ADD CONSTRAINT "registres_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reglages_notification" ADD CONSTRAINT "reglages_notification_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "releves_concurrent" ADD CONSTRAINT "releves_concurrent_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "releves_concurrent" ADD CONSTRAINT "releves_concurrent_concurrent_id_concurrents_id_fk" FOREIGN KEY ("concurrent_id") REFERENCES "public"."concurrents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shootings" ADD CONSTRAINT "shootings_tache_id_taches_id_fk" FOREIGN KEY ("tache_id") REFERENCES "public"."taches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shootings" ADD CONSTRAINT "shootings_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shootings" ADD CONSTRAINT "shootings_photographe_id_personnes_id_fk" FOREIGN KEY ("photographe_id") REFERENCES "public"."personnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shootings" ADD CONSTRAINT "shootings_moodboard_board_id_boards_id_fk" FOREIGN KEY ("moodboard_board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taches" ADD CONSTRAINT "taches_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taches" ADD CONSTRAINT "taches_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "public"."campagnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taches" ADD CONSTRAINT "taches_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tendances" ADD CONSTRAINT "tendances_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "types_campagne" ADD CONSTRAINT "types_campagne_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "types_campagne" ADD CONSTRAINT "types_campagne_modele_rituel_id_modeles_rituel_id_fk" FOREIGN KEY ("modele_rituel_id") REFERENCES "public"."modeles_rituel"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_personne_id_personnes_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."personnes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ambassadeurs_code_promo_idx" ON "ambassadeurs" USING btree ("organisation_id","code_promo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "articles_reference_idx" ON "articles" USING btree ("organisation_id","reference");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audits_at_idx" ON "audits" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_contact_nom_idx" ON "categories_contact" USING btree ("organisation_id","nom");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coloris_code_idx" ON "coloris" USING btree ("organisation_id","code_3l");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commentaires_entite_idx" ON "commentaires" USING btree ("entite_type","entite_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gammes_prefixe_idx" ON "gammes" USING btree ("organisation_id","code_prefixe");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integrations_plateforme_idx" ON "integrations" USING btree ("organisation_id","plateforme");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listes_parametrables_categorie_idx" ON "listes_parametrables" USING btree ("categorie");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "membres_utilisateur_organisation_idx" ON "membres" USING btree ("utilisateur_id","organisation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_utilisateur_idx" ON "notifications" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organisations_slug_idx" ON "organisations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parametre_systeme_cle_idx" ON "parametre_systeme" USING btree ("cle");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partages_personne_token_idx" ON "partages_personne" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "utilisateurs_email_idx" ON "utilisateurs" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "utilisateurs_ical_idx" ON "utilisateurs" USING btree ("ical_token");