ALTER TABLE `welcome_config` ADD `auto_role_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `welcome_config` ADD `auto_role_ids` text DEFAULT '[]' NOT NULL;