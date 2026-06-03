CREATE TABLE `birthday_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`channel_id` text,
	`role_id` text,
	`last_run_day` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `birthdays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`month` integer NOT NULL,
	`day` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `birthdays_guild_user` ON `birthdays` (`guild_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `birthdays_guild_md` ON `birthdays` (`guild_id`,`month`,`day`);