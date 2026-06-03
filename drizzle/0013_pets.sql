CREATE TABLE `pet_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`pet_name` text NOT NULL,
	`note` text,
	`image_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `pet_submissions_guild_status` ON `pet_submissions` (`guild_id`,`status`);