ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;
--> statement-breakpoint
CREATE TABLE `folderPublishedShares` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`folder_id` text,
	`user_id` text,
	`token` text NOT NULL,
	`markdown` text DEFAULT '',
	`likes` integer DEFAULT 0,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
