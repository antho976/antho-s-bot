CREATE TABLE `honeypot_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text,
	`channel_id` text,
	`action` text NOT NULL,
	`purged` integer DEFAULT 0 NOT NULL,
	`snippet` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `honeypot_actions_guild_created` ON `honeypot_actions` (`guild_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `honeypot_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`channel_ids` text DEFAULT '[]' NOT NULL,
	`mute_mode` text DEFAULT 'role' NOT NULL,
	`mute_role_id` text,
	`timeout_minutes` integer DEFAULT 40320 NOT NULL,
	`purge_lookback_minutes` integer DEFAULT 10 NOT NULL,
	`ping_target_type` text DEFAULT 'user' NOT NULL,
	`ping_target_id` text,
	`alert_channel_id` text,
	`exempt_role_ids` text DEFAULT '[]' NOT NULL,
	`also_ban` integer DEFAULT false NOT NULL,
	`dm_user` integer DEFAULT false NOT NULL,
	`dm_message` text,
	`updated_at` integer
);
