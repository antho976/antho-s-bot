CREATE TABLE `polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text,
	`question` text NOT NULL,
	`options_json` text NOT NULL,
	`multi` integer DEFAULT false NOT NULL,
	`ends_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text,
	`created_at` integer,
	`ended_at` integer
);
--> statement-breakpoint
CREATE INDEX `polls_status_ends` ON `polls` (`status`,`ends_at`);