CREATE TABLE `reaction_role_pairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`emoji` text NOT NULL,
	`role_id` text NOT NULL,
	`label` text
);
--> statement-breakpoint
CREATE INDEX `rr_pairs_message` ON `reaction_role_pairs` (`message_id`);--> statement-breakpoint
CREATE TABLE `reaction_role_panels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`title` text,
	`mode` text DEFAULT 'toggle' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rr_panels_message` ON `reaction_role_panels` (`message_id`);