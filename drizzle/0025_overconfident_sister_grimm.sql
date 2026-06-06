CREATE TABLE `smartreply_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`model` text DEFAULT 'meta-llama/llama-3.3-70b-instruct:free' NOT NULL,
	`bot_name` text DEFAULT 'Assistant' NOT NULL,
	`persona` text DEFAULT '' NOT NULL,
	`reply_chance` integer DEFAULT 5 NOT NULL,
	`cooldown_seconds` integer DEFAULT 30 NOT NULL,
	`context_messages` integer DEFAULT 8 NOT NULL,
	`max_reply_chars` integer DEFAULT 600 NOT NULL,
	`min_message_length` integer DEFAULT 6 NOT NULL,
	`daily_cap` integer DEFAULT 200 NOT NULL,
	`reply_on_mention` integer DEFAULT true NOT NULL,
	`ignore_bots` integer DEFAULT true NOT NULL,
	`allowed_channels_json` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `smartreply_memory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `smartreply_memory_guild` ON `smartreply_memory` (`guild_id`);