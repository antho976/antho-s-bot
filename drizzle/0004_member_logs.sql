CREATE TABLE `member_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`type` text NOT NULL,
	`user_id` text,
	`summary` text NOT NULL,
	`data_json` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `member_events_guild_created` ON `member_events` (`guild_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `member_events_type` ON `member_events` (`type`);--> statement-breakpoint
CREATE TABLE `member_log_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`channel_id` text,
	`log_joins` integer DEFAULT true NOT NULL,
	`log_leaves` integer DEFAULT true NOT NULL,
	`log_bans` integer DEFAULT true NOT NULL,
	`log_unbans` integer DEFAULT true NOT NULL,
	`log_nicknames` integer DEFAULT true NOT NULL,
	`log_roles` integer DEFAULT true NOT NULL,
	`log_message_edits` integer DEFAULT true NOT NULL,
	`log_message_deletes` integer DEFAULT true NOT NULL,
	`log_voice` integer DEFAULT false NOT NULL,
	`updated_at` integer
);
