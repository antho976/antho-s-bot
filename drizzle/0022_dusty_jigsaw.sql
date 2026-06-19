CREATE TABLE `rpg_gather_talents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`skill_id` text NOT NULL,
	`node_id` text NOT NULL,
	`rank` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rpg_gather_talents_unique` ON `rpg_gather_talents` (`player_id`,`skill_id`,`node_id`);--> statement-breakpoint
CREATE TABLE `rpg_gathering` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`skill_id` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rpg_gathering_player_skill` ON `rpg_gathering` (`player_id`,`skill_id`);--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `tool_tier` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `gather_skill_id` text;--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `gather_area_id` text;--> statement-breakpoint
ALTER TABLE `rpg_players` ADD `gather_started_at` integer;