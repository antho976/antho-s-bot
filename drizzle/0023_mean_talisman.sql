CREATE TABLE `rpg_professions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`prof_id` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rpg_professions_player_prof` ON `rpg_professions` (`player_id`,`prof_id`);--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `equipped_weapon_id` integer;