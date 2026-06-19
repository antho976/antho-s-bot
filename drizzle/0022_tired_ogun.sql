ALTER TABLE `level_config` ADD `announce_ping` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `level_config` ADD `announce_min_level` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `level_config` ADD `level_up_message` text;--> statement-breakpoint
ALTER TABLE `level_config` ADD `stack_role_rewards` integer DEFAULT true NOT NULL;