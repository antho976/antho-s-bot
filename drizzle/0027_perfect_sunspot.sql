ALTER TABLE `smartreply_config` ADD `images_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `smartreply_config` ADD `image_provider` text DEFAULT 'pollinations' NOT NULL;--> statement-breakpoint
ALTER TABLE `smartreply_config` ADD `image_daily_cap` integer DEFAULT 25 NOT NULL;