CREATE TABLE `starboard_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`emoji` text DEFAULT '⭐' NOT NULL,
	`threshold` integer DEFAULT 3 NOT NULL,
	`channel_id` text,
	`self_star` integer DEFAULT false NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `starboard_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`original_message_id` text NOT NULL,
	`original_channel_id` text NOT NULL,
	`starboard_message_id` text NOT NULL,
	`star_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `starboard_posts_original` ON `starboard_posts` (`original_message_id`);