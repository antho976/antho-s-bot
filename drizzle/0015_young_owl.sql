CREATE TABLE `rpg_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`channel_id` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `rpg_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	`class_id` text DEFAULT 'adventurer' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`hp` integer DEFAULT 0 NOT NULL,
	`energy` integer DEFAULT 0 NOT NULL,
	`gold` integer DEFAULT 0 NOT NULL,
	`last_regen_at` integer,
	`last_hub_channel_id` text,
	`last_hub_message_id` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rpg_players_guild_user` ON `rpg_players` (`guild_id`,`user_id`);