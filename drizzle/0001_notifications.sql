CREATE TABLE `stream_channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`platform` text NOT NULL,
	`channel_ref` text NOT NULL,
	`display_name` text,
	`enabled` integer DEFAULT true NOT NULL,
	`discord_channel_id` text,
	`message_template` text,
	`use_embed` integer DEFAULT true NOT NULL,
	`ping_role_id` text,
	`alert_on_live` integer DEFAULT true NOT NULL,
	`alert_on_end` integer DEFAULT false NOT NULL,
	`alert_on_upload` integer DEFAULT true NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stream_channels_unique` ON `stream_channels` (`guild_id`,`platform`,`channel_ref`);--> statement-breakpoint
CREATE TABLE `stream_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` integer NOT NULL,
	`type` text NOT NULL,
	`payload_json` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `stream_events_channel` ON `stream_events` (`channel_id`);--> statement-breakpoint
CREATE INDEX `stream_events_created` ON `stream_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `stream_schedule` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` integer,
	`title` text,
	`starts_at` integer NOT NULL,
	`remind_1h` integer DEFAULT true NOT NULL,
	`remind_10m` integer DEFAULT true NOT NULL,
	`remind_1h_sent` integer DEFAULT false NOT NULL,
	`remind_10m_sent` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `stream_schedule_starts` ON `stream_schedule` (`starts_at`);--> statement-breakpoint
CREATE TABLE `stream_state` (
	`channel_id` integer PRIMARY KEY NOT NULL,
	`is_live` integer DEFAULT false NOT NULL,
	`last_live_at` integer,
	`last_ended_at` integer,
	`last_video_id` text,
	`current_title` text,
	`current_game` text,
	`updated_at` integer
);
