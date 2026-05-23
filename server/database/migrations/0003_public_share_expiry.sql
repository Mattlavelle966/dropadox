ALTER TABLE `folderPublicShares` ADD `expires_at` text;
UPDATE `folderPublicShares` SET `expires_at` = datetime('now', '+30 days') WHERE `expires_at` IS NULL;
