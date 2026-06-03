CREATE TABLE `custom_commands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`response_text` text DEFAULT '' NOT NULL,
	`image_url` text,
	`embed` integer DEFAULT false NOT NULL,
	`auto_delete_sec` integer DEFAULT 0 NOT NULL,
	`max_uses` integer DEFAULT 0 NOT NULL,
	`uses_count` integer DEFAULT 0 NOT NULL,
	`cooldown_sec` integer DEFAULT 0 NOT NULL,
	`allowed_roles` text,
	`allowed_channels` text,
	`created_by` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_commands_guild_name` ON `custom_commands` (`guild_id`,`name`);