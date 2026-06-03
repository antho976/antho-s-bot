CREATE TABLE `automod_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text,
	`rule` text NOT NULL,
	`action` text NOT NULL,
	`snippet` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `automod_actions_guild_created` ON `automod_actions` (`guild_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `automod_blocklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`domain` text NOT NULL,
	`note` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `automod_blocklist_guild` ON `automod_blocklist` (`guild_id`);--> statement-breakpoint
CREATE TABLE `automod_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`delete_message` integer DEFAULT true NOT NULL,
	`timeout_user` integer DEFAULT true NOT NULL,
	`timeout_minutes` integer DEFAULT 60 NOT NULL,
	`log_channel_id` text,
	`check_blocklist` integer DEFAULT true NOT NULL,
	`check_typosquats` integer DEFAULT true NOT NULL,
	`check_scam_phrases` integer DEFAULT true NOT NULL,
	`updated_at` integer
);
