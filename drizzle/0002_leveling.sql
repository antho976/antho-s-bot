CREATE TABLE `level_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`xp_msg_min` integer DEFAULT 15 NOT NULL,
	`xp_msg_max` integer DEFAULT 25 NOT NULL,
	`msg_cooldown_sec` integer DEFAULT 60 NOT NULL,
	`xp_per_voice_min` integer DEFAULT 5 NOT NULL,
	`xp_per_reaction` integer DEFAULT 0 NOT NULL,
	`curve_type` text DEFAULT 'multiplier' NOT NULL,
	`curve_base` integer DEFAULT 100 NOT NULL,
	`curve_factor` real DEFAULT 1.2 NOT NULL,
	`announce` integer DEFAULT true NOT NULL,
	`announce_channel_id` text,
	`voice_require_active` integer DEFAULT true NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `level_curve` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`level` integer NOT NULL,
	`xp_required` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `level_curve_guild_level` ON `level_curve` (`guild_id`,`level`);--> statement-breakpoint
CREATE TABLE `level_rewards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`level` integer NOT NULL,
	`role_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `level_rewards_guild_level` ON `level_rewards` (`guild_id`,`level`);--> statement-breakpoint
CREATE TABLE `levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`prestige` integer DEFAULT 0 NOT NULL,
	`voice_minutes` integer DEFAULT 0 NOT NULL,
	`last_message_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `levels_guild_user` ON `levels` (`guild_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `levels_guild_xp` ON `levels` (`guild_id`,`xp`);