CREATE TABLE `support_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`channel_id` text,
	`staff_role_id` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`number` integer NOT NULL,
	`user_id` text NOT NULL,
	`subject` text NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`thread_id` text,
	`created_at` integer,
	`closed_at` integer,
	`closed_by` text
);
--> statement-breakpoint
CREATE INDEX `tickets_guild_status` ON `tickets` (`guild_id`,`status`);--> statement-breakpoint
CREATE INDEX `tickets_thread` ON `tickets` (`thread_id`);