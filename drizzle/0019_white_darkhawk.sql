CREATE TABLE `feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`category` text DEFAULT 'suggestion' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `feedback_guild_created` ON `feedback` (`guild_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `levels` ADD `messages` integer DEFAULT 0 NOT NULL;