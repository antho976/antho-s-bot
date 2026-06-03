CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`avatar` text,
	`access_level` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text,
	`before_json` text,
	`after_json` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `audit_log_created` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `feature_toggles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`feature_key` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`config_json` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_toggles_guild_key` ON `feature_toggles` (`guild_id`,`feature_key`);--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`joined_at` integer
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL,
	`meta_json` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `logs_created` ON `logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `logs_level` ON `logs` (`level`);--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`run_at` integer,
	`cron` text,
	`payload_json` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `scheduled_tasks_status` ON `scheduled_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `scheduled_tasks_run_at` ON `scheduled_tasks` (`run_at`);--> statement-breakpoint
CREATE TABLE `analytics_daily` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`metric` text NOT NULL,
	`day` text NOT NULL,
	`dims_json` text,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_daily_unique` ON `analytics_daily` (`guild_id`,`metric`,`day`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`event_type` text NOT NULL,
	`props_json` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `analytics_events_created` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_type` ON `analytics_events` (`event_type`);