CREATE TABLE `giveaway_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`giveaway_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `giveaway_entries_unique` ON `giveaway_entries` (`giveaway_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `giveaways` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text,
	`prize` text NOT NULL,
	`winners_count` integer DEFAULT 1 NOT NULL,
	`ends_at` integer NOT NULL,
	`ping_role_id` text,
	`min_level` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`status` text DEFAULT 'active' NOT NULL,
	`winners_json` text,
	`created_at` integer,
	`ended_at` integer
);
--> statement-breakpoint
CREATE INDEX `giveaways_status_ends` ON `giveaways` (`status`,`ends_at`);