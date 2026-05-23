ALTER TABLE `folders` ADD `parent_id` text;
--> statement-breakpoint
CREATE TABLE `ipBlacklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip_address` text NOT NULL,
	`reason` text DEFAULT 'captcha_failed' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
