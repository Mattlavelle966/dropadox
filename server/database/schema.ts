import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: int("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    password: text("password").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("user"),
    storageMaxBytes: int("storage_max_bytes").notNull().default(13_000_000_000),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

export const uploads = sqliteTable("uploads", {
    id: int("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    folderId: text("folder_id").references(() => folders.id),
    filePath: text("file_path"),
    privacyFlag: text("privacy_flag"),
    size: int("size").default(0),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

export const folders = sqliteTable("folders", {
    id: int("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    iconPath: text("icon_path"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

export const folderPublicShares = sqliteTable("folderPublicShares", {
    id: int("id").primaryKey({ autoIncrement: true }),
    folderId: text("folder_id").references(() => folders.id),
    userId: text("user_id").references(() => users.id),
    token: text("token").notNull(),
    passwordHash: text("password_hash"),
    expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

export const folderPublishedShares = sqliteTable("folderPublishedShares", {
    id: int("id").primaryKey({ autoIncrement: true }),
    folderId: text("folder_id").references(() => folders.id),
    userId: text("user_id").references(() => users.id),
    token: text("token").notNull(),
    markdown: text("markdown").default(""),
    likes: int("likes").default(0),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

export const folderUserShares = sqliteTable("folderUserShares", {
    id: int("id").primaryKey({ autoIncrement: true }),
    folderId: text("folder_id").references(() => folders.id),
    ownerId: text("owner_id").references(() => users.id),
    sharedWithUserId: text("shared_with_user_id").references(() => users.id),
    role: text("role").default("member"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

export const hiddenSharedStorageFolders = sqliteTable("hiddenSharedStorageFolders", {
    id: int("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    folderId: text("folder_id").references(() => folders.id),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})

export const userSettings = sqliteTable("userSettings", {
    id: int("id").primaryKey({ autoIncrement: true }),
    userID: text("user_id").references(() => users.id),
    colorMode: text("color_mode").default('light'),
    searchVisible: text("search_visible").default('true'),
    avatarPath: text("avatar_path"),
})

export const ipBlacklist = sqliteTable("ipBlacklist", {
    id: int("id").primaryKey({ autoIncrement: true }),
    ipAddress: text("ip_address").notNull(),
    reason: text("reason").notNull().default("captcha_failed"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
})
