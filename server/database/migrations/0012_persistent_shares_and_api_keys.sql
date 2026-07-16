-- Public links are permanent until their owner explicitly removes them.
-- Clearing the legacy expiry restores existing tokens without changing them.
UPDATE `folderPublicShares` SET `expires_at` = NULL WHERE `expires_at` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `apiKeys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `apiKeys_key_hash_unique` ON `apiKeys` (`key_hash`);
