CREATE TABLE `partages_personne` (
	`id` text PRIMARY KEY NOT NULL,
	`personne_id` text NOT NULL,
	`token` text NOT NULL,
	`expire_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`personne_id`) REFERENCES `personnes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partages_personne_token_idx` ON `partages_personne` (`token`);