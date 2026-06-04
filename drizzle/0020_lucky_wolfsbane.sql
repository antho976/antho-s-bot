CREATE TABLE `member_role_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`roles_json` text NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_role_snap_guild_user` ON `member_role_snapshots` (`guild_id`,`user_id`);