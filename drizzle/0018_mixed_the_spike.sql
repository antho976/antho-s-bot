CREATE TABLE `rpg_inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`item_id` text NOT NULL,
	`qty` integer DEFAULT 0 NOT NULL,
	`instance_stats_json` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `rpg_inventory_player` ON `rpg_inventory` (`player_id`);--> statement-breakpoint
ALTER TABLE `rpg_players` DROP COLUMN `keys`;