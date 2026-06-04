CREATE TABLE `rpg_player_skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`node_id` text NOT NULL,
	`rank` integer DEFAULT 1 NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rpg_player_skills_unique` ON `rpg_player_skills` (`player_id`,`node_id`);