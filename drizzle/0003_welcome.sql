CREATE TABLE `welcome_backgrounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text DEFAULT 'both' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `welcome_backgrounds_guild` ON `welcome_backgrounds` (`guild_id`);--> statement-breakpoint
CREATE TABLE `welcome_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`welcome_enabled` integer DEFAULT false NOT NULL,
	`welcome_channel_id` text,
	`welcome_mode` text DEFAULT 'both' NOT NULL,
	`welcome_message` text DEFAULT 'Welcome {user} to {server}!' NOT NULL,
	`goodbye_enabled` integer DEFAULT false NOT NULL,
	`goodbye_channel_id` text,
	`goodbye_mode` text DEFAULT 'text' NOT NULL,
	`goodbye_message` text DEFAULT '{username} just left the server.' NOT NULL,
	`random_background` integer DEFAULT true NOT NULL,
	`updated_at` integer
);
