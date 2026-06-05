CREATE TABLE `rpg_dungeon_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`dungeon_id` text NOT NULL,
	`state_json` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rpg_dungeon_runs_player` ON `rpg_dungeon_runs` (`player_id`);--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `adventure_charges` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `adventure_charge_at` integer;--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `adventure_encounter_json` text;