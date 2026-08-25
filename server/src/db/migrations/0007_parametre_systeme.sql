DROP TABLE `configurations_systeme`;--> statement-breakpoint
CREATE TABLE `parametre_systeme` (
	`id` text PRIMARY KEY NOT NULL,
	`cle` text NOT NULL,
	`valeur` text,
	`chiffre` integer DEFAULT false NOT NULL,
	`categorie` text NOT NULL,
	`modifie_par` text,
	`modifie_le` text NOT NULL,
	FOREIGN KEY (`modifie_par`) REFERENCES `utilisateurs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parametre_systeme_cle_idx` ON `parametre_systeme` (`cle`);
