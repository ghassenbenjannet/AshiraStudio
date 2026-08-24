CREATE TABLE `agents_campagne` (
	`id` text PRIMARY KEY NOT NULL,
	`campagne_id` text,
	`nom` text NOT NULL,
	`avatar_couleur` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`outils_actives` text DEFAULT '[]' NOT NULL,
	`actif` integer DEFAULT true NOT NULL,
	`cree_par` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cree_par`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ambassadeurs` (
	`personne_id` text PRIMARY KEY NOT NULL,
	`code_promo` text NOT NULL,
	`statut` text NOT NULL,
	`pieces` text DEFAULT '[]' NOT NULL,
	`posts` text DEFAULT '[]' NOT NULL,
	`ventes_attribuees_dt` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`personne_id`) REFERENCES `personnes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ambassadeurs_code_promo_idx` ON `ambassadeurs` (`code_promo`);--> statement-breakpoint
CREATE TABLE `article_coloris` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`coloris_id` text NOT NULL,
	`photos` text DEFAULT '[]' NOT NULL,
	`prix_dt` real,
	`statut` text DEFAULT 'actif' NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coloris_id`) REFERENCES `coloris`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `article_couts` (
	`article_id` text PRIMARY KEY NOT NULL,
	`tissu_dt` real DEFAULT 0 NOT NULL,
	`faconnage_dt` real DEFAULT 0 NOT NULL,
	`fournitures_dt` real DEFAULT 0 NOT NULL,
	`packaging_dt` real DEFAULT 0 NOT NULL,
	`transport_unitaire_dt` real DEFAULT 0 NOT NULL,
	`autre_dt` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `article_skus` (
	`id` text PRIMARY KEY NOT NULL,
	`article_coloris_id` text NOT NULL,
	`taille` text NOT NULL,
	`qte_produite` integer DEFAULT 0 NOT NULL,
	`qte_stock` integer DEFAULT 0 NOT NULL,
	`mesures` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`article_coloris_id`) REFERENCES `article_coloris`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`nom` text NOT NULL,
	`gamme_id` text NOT NULL,
	`categorie_id` text NOT NULL,
	`chapitre_id` text,
	`fit` text,
	`description_commerciale` text,
	`composition` text DEFAULT '[]' NOT NULL,
	`grammage_gsm` integer,
	`entretien_codes` text DEFAULT '[]' NOT NULL,
	`numerote` integer DEFAULT false NOT NULL,
	`numerotation_total` integer,
	`fournisseur_id` text,
	`delai_production_jours` integer,
	`moq` integer,
	`statut_cycle` text DEFAULT 'idee' NOT NULL,
	`notes_interne` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`gamme_id`) REFERENCES `gammes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categorie_id`) REFERENCES `categories_produit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chapitre_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fournisseur_id`) REFERENCES `personnes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_reference_idx` ON `articles` (`reference`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`fichier_url` text NOT NULL,
	`vignette_url` text,
	`nom` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`campagne_ids` text DEFAULT '[]' NOT NULL,
	`article_coloris_ids` text DEFAULT '[]' NOT NULL,
	`shooting_id` text,
	`createur_personne_ids` text DEFAULT '[]' NOT NULL,
	`source` text NOT NULL,
	`droits` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shooting_id`) REFERENCES `shootings`(`tache_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`utilisateur_id` text NOT NULL,
	`action` text NOT NULL,
	`entite_type` text NOT NULL,
	`entite_id` text,
	`avant` text,
	`apres` text,
	`via_agent` integer DEFAULT false NOT NULL,
	`conversation_id` text,
	`at` text NOT NULL,
	FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audits_at_idx` ON `audits` (`at`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`campagne_id` text,
	`items` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budget_lignes` (
	`id` text PRIMARY KEY NOT NULL,
	`campagne_id` text NOT NULL,
	`poste_id` text NOT NULL,
	`libelle` text NOT NULL,
	`prevu_dt` real DEFAULT 0 NOT NULL,
	`engage_dt` real DEFAULT 0 NOT NULL,
	`reel_dt` real DEFAULT 0 NOT NULL,
	`personne_id` text,
	`justificatif_asset_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`poste_id`) REFERENCES `listes_parametrables`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`personne_id`) REFERENCES `personnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`justificatif_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campagne_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`campagne_id` text NOT NULL,
	`source` text NOT NULL,
	`article_coloris_id` text,
	`url` text,
	`titre_extrait` text,
	`image_extraite_url` text,
	`photo_asset_id` text,
	`texte` text,
	`ordre` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`article_coloris_id`) REFERENCES `article_coloris`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`photo_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campagnes` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`type_campagne_id` text NOT NULL,
	`occasion_id` text,
	`date_debut` text NOT NULL,
	`date_fin` text NOT NULL,
	`statut` text DEFAULT 'preparation' NOT NULL,
	`objectif` text NOT NULL,
	`objectif_texte` text,
	`description` text,
	`budget_total_dt` real DEFAULT 0 NOT NULL,
	`canaux` text DEFAULT '[]' NOT NULL,
	`kpi_cibles` text DEFAULT '{}' NOT NULL,
	`kpi_cibles_verrouillees` integer DEFAULT false NOT NULL,
	`resultats` text DEFAULT '{}' NOT NULL,
	`rapport` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`type_campagne_id`) REFERENCES `types_campagne`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`occasion_id`) REFERENCES `listes_parametrables`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories_contact` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`icone` text,
	`systeme` integer DEFAULT false NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_contact_nom_idx` ON `categories_contact` (`nom`);--> statement-breakpoint
CREATE TABLE `categories_produit` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`slot_look` text NOT NULL,
	`grille_tailles_id` text NOT NULL,
	`grille_tailles_id_secondaire` text,
	`gabarit_mesures` text NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`grille_tailles_id`) REFERENCES `grilles_taille`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grille_tailles_id_secondaire`) REFERENCES `grilles_taille`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `codes_entretien` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`icone` text,
	`ordre` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coloris` (
	`id` text PRIMARY KEY NOT NULL,
	`nom_commercial` text NOT NULL,
	`code_3l` text NOT NULL,
	`hex` text NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coloris_code_idx` ON `coloris` (`code_3l`);--> statement-breakpoint
CREATE TABLE `commentaires` (
	`id` text PRIMARY KEY NOT NULL,
	`entite_type` text NOT NULL,
	`entite_id` text NOT NULL,
	`auteur_id` text NOT NULL,
	`contenu` text NOT NULL,
	`mentions` text DEFAULT '[]' NOT NULL,
	`resolu` integer DEFAULT false NOT NULL,
	`retire` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`auteur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commentaires_entite_idx` ON `commentaires` (`entite_type`,`entite_id`);--> statement-breakpoint
CREATE TABLE `concurrents` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`instagram` text,
	`segment` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contenu_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`contenu_id` text NOT NULL,
	`caption` text NOT NULL,
	`at` text NOT NULL,
	`par` text NOT NULL,
	FOREIGN KEY (`contenu_id`) REFERENCES `contenus`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`par`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contenus` (
	`id` text PRIMARY KEY NOT NULL,
	`campagne_id` text NOT NULL,
	`type` text NOT NULL,
	`plateformes` text DEFAULT '[]' NOT NULL,
	`titre` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`registre_id` text,
	`date_publication` text,
	`statut` text DEFAULT 'brouillon' NOT NULL,
	`asset_ids` text DEFAULT '[]' NOT NULL,
	`article_coloris_ids` text DEFAULT '[]' NOT NULL,
	`auteur_id` text NOT NULL,
	`approbateur_id` text,
	`publie_le` text,
	`resultats` text,
	`score_marque` real,
	`score_detail` text,
	`cree_par_agent` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registre_id`) REFERENCES `registres`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auteur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approbateur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`titre` text DEFAULT '' NOT NULL,
	`agent_id` text,
	`utilisateur_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents_campagne`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expressions` (
	`id` text PRIMARY KEY NOT NULL,
	`texte` text NOT NULL,
	`transliteration` text,
	`registre_id` text NOT NULL,
	`statut` text DEFAULT 'a_valider' NOT NULL,
	`contexte_usage` text,
	`exemple` text,
	`ajoutee_par` text,
	`validee_par` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`registre_id`) REFERENCES `registres`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ajoutee_par`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`validee_par`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gammes` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`code_prefixe` text NOT NULL,
	`couleur` text,
	`alerte_baisse_prix` integer DEFAULT false NOT NULL,
	`message_alerte` text,
	`marge_cible_pct` real DEFAULT 60 NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gammes_prefixe_idx` ON `gammes` (`code_prefixe`);--> statement-breakpoint
CREATE TABLE `grilles_taille` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`valeurs` text DEFAULT '[]' NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `historique_statuts` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`de` text,
	`vers` text NOT NULL,
	`at` text NOT NULL,
	`par` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`par`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `idees` (
	`id` text PRIMARY KEY NOT NULL,
	`contenu` text NOT NULL,
	`source` text NOT NULL,
	`article_coloris_id` text,
	`tache_id` text,
	`statut` text DEFAULT 'nouvelle' NOT NULL,
	`score` real,
	`score_justification` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`article_coloris_id`) REFERENCES `article_coloris`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tache_id`) REFERENCES `taches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`plateforme` text NOT NULL,
	`statut` text DEFAULT 'deconnectee' NOT NULL,
	`credentials_chiffres` text,
	`dernier_sync` text,
	`frequence` text DEFAULT 'quotidienne' NOT NULL,
	`derniere_erreur` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_plateforme_idx` ON `integrations` (`plateforme`);--> statement-breakpoint
CREATE TABLE `lecons` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`texte` text NOT NULL,
	`preuve` text,
	`campagne_id` text,
	`statut` text DEFAULT 'active' NOT NULL,
	`injectee_agents` integer DEFAULT true NOT NULL,
	`auteur_id` text NOT NULL,
	`fermetures_sans_reconfirmation` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`auteur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `listes_parametrables` (
	`id` text PRIMARY KEY NOT NULL,
	`categorie` text NOT NULL,
	`nom` text NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `listes_parametrables_categorie_idx` ON `listes_parametrables` (`categorie`);--> statement-breakpoint
CREATE TABLE `look_items` (
	`id` text PRIMARY KEY NOT NULL,
	`look_id` text NOT NULL,
	`slot` text NOT NULL,
	`source` text NOT NULL,
	`article_coloris_id` text,
	`photo_asset_id` text,
	`texte` text,
	`note` text,
	`ordre` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`look_id`) REFERENCES `looks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`article_coloris_id`) REFERENCES `article_coloris`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`photo_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `looks` (
	`id` text PRIMARY KEY NOT NULL,
	`shooting_id` text NOT NULL,
	`nom` text NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`note` text,
	FOREIGN KEY (`shooting_id`) REFERENCES `shootings`(`tache_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matieres` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`nom_ar` text,
	`note` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`contenu` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metrique_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`plateforme` text NOT NULL,
	`date` text NOT NULL,
	`kpis` text DEFAULT '{}' NOT NULL,
	`source` text DEFAULT 'manuel' NOT NULL,
	`campagne_id` text,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `modeles_checklist` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modeles_rituel` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`jalons` text DEFAULT '[]' NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`utilisateur_id` text NOT NULL,
	`type` text NOT NULL,
	`entite_type` text NOT NULL,
	`entite_id` text NOT NULL,
	`lu` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_utilisateur_idx` ON `notifications` (`utilisateur_id`);--> statement-breakpoint
CREATE TABLE `personnes` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`categorie_ids` text DEFAULT '[]' NOT NULL,
	`type` text NOT NULL,
	`telephone` text,
	`email` text,
	`instagram` text,
	`ville` text,
	`tarif_jour_dt` real,
	`tarifs_prestations` text DEFAULT '[]' NOT NULL,
	`tailles` text DEFAULT '{}' NOT NULL,
	`portfolio_url` text,
	`book_asset_ids` text DEFAULT '[]' NOT NULL,
	`materiel` text,
	`styles` text DEFAULT '[]' NOT NULL,
	`specialites` text DEFAULT '[]' NOT NULL,
	`delai_moyen_jours` integer,
	`moq_habituel` integer,
	`conditions_paiement` text,
	`disponibilites` text,
	`note_5` real,
	`notes` text,
	`actif` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `poses` (
	`id` text PRIMARY KEY NOT NULL,
	`shooting_id` text NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`article_coloris_id` text,
	`look_id` text,
	`duree_min` integer,
	FOREIGN KEY (`shooting_id`) REFERENCES `shootings`(`tache_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`article_coloris_id`) REFERENCES `article_coloris`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`look_id`) REFERENCES `looks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recommandations` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`titre` text NOT NULL,
	`justification` text NOT NULL,
	`source_donnees` text DEFAULT '[]' NOT NULL,
	`impact` text NOT NULL,
	`statut` text DEFAULT 'nouvelle' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registres` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`nom` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`ordre` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reglages_notification` (
	`utilisateur_id` text NOT NULL,
	`type` text NOT NULL,
	`canaux` text DEFAULT '["in_app"]' NOT NULL,
	PRIMARY KEY(`utilisateur_id`, `type`),
	FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `releves_concurrent` (
	`id` text PRIMARY KEY NOT NULL,
	`concurrent_id` text NOT NULL,
	`date` text NOT NULL,
	`followers` integer DEFAULT 0 NOT NULL,
	`posts_semaine` integer DEFAULT 0 NOT NULL,
	`observation` text,
	`lien` text,
	FOREIGN KEY (`concurrent_id`) REFERENCES `concurrents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`utilisateur_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shootings` (
	`tache_id` text PRIMARY KEY NOT NULL,
	`photographe_id` text,
	`modele_ids` text DEFAULT '[]' NOT NULL,
	`decor` text,
	`heure_lumiere` text,
	`duree_min` integer DEFAULT 180 NOT NULL,
	`moodboard_board_id` text,
	`refs_visuelles` text DEFAULT '[]' NOT NULL,
	`autorisation_lieu` text DEFAULT 'non_requise' NOT NULL,
	`autorisation_lieu_note` text,
	`plan_b_lieu` text,
	`grooming` text,
	`pieces` text DEFAULT '[]' NOT NULL,
	`materiel` text DEFAULT '[]' NOT NULL,
	`preparation_pieces` text DEFAULT '[]' NOT NULL,
	`retour_pieces` text DEFAULT '[]' NOT NULL,
	`livrable_photos` text,
	`livrable_videos` text,
	`statut_post_prod` text DEFAULT 'a_trier' NOT NULL,
	`nb_photos_recues` integer,
	`notes` text,
	FOREIGN KEY (`tache_id`) REFERENCES `taches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`photographe_id`) REFERENCES `personnes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moodboard_board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `taches` (
	`id` text PRIMARY KEY NOT NULL,
	`campagne_id` text NOT NULL,
	`titre` text NOT NULL,
	`type` text NOT NULL,
	`date_echeance` text NOT NULL,
	`assigne_ids` text DEFAULT '[]' NOT NULL,
	`lieu` text,
	`statut` text DEFAULT 'todo' NOT NULL,
	`done_at` text,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campagne_id`) REFERENCES `campagnes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tendances` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`categorie` text NOT NULL,
	`titre` text NOT NULL,
	`description` text NOT NULL,
	`lien` text,
	`source_verifiee` integer DEFAULT true NOT NULL,
	`scores` text NOT NULL,
	`statut` text DEFAULT 'a_evaluer' NOT NULL,
	`adaptation` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `types_campagne` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`modele_rituel_id` text,
	`ordre` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`modele_rituel_id`) REFERENCES `modeles_rituel`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `utilisateurs` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`nom` text NOT NULL,
	`personne_id` text,
	`role_systeme` text NOT NULL,
	`langue` text DEFAULT 'fr' NOT NULL,
	`ical_token` text NOT NULL,
	`vue_board_preferee` text DEFAULT 'liste' NOT NULL,
	`derniere_connexion` text,
	`echecs_login` integer DEFAULT 0 NOT NULL,
	`verrouille_jusqua` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`personne_id`) REFERENCES `personnes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `utilisateurs_email_idx` ON `utilisateurs` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `utilisateurs_ical_idx` ON `utilisateurs` (`ical_token`);