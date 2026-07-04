ALTER TABLE `stream_channels` ADD `stats_interval_min` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `live_message_id` text;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `live_message_channel_id` text;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `current_viewers` integer;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `peak_viewers` integer;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `viewer_sum` integer;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `viewer_samples` integer;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `last_stats_at` integer;--> statement-breakpoint
ALTER TABLE `stream_state` ADD `is_test` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `level_config` ADD `announce_ping` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `level_config` ADD `announce_min_level` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `level_config` ADD `level_up_message` text;--> statement-breakpoint
ALTER TABLE `level_config` ADD `stack_role_rewards` integer DEFAULT true NOT NULL;