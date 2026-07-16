import path from "node:path";
import { createClient, type InStatement } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const legacyBaselineTimestamp = 1784222884911;
const databaseUrl = process.env.DB_FILE_NAME;
const migrationsFolder = path.resolve("server/database/migrations");

if (!databaseUrl) {
    throw new Error("DB_FILE_NAME is required to run database migrations");
}

const client = createClient({ url: databaseUrl });

async function getTableNames() {
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
    return new Set(result.rows.map((row) => String(row.name)));
}

async function getColumnNames(tableName: string) {
    const result = await client.execute(`PRAGMA table_info(\"${tableName.replace(/\"/g, "\"\"")}\")`);
    return new Set(result.rows.map((row) => String(row.name)));
}

async function reconcileLegacyDatabase() {
    const tables = await getTableNames();

    // A database without the original users table is new, so Drizzle can apply
    // the normal migration chain without any compatibility work.
    if (!tables.has("users")) {
        return false;
    }

    if (tables.has("__drizzle_migrations")) {
        const latestMigration = await client.execute(
            "SELECT MAX(created_at) AS created_at FROM \"__drizzle_migrations\""
        );
        const latestTimestamp = Number(latestMigration.rows[0]?.created_at ?? 0);

        if (latestTimestamp >= legacyBaselineTimestamp) {
            return false;
        }
    }

    const statements: InStatement[] = [];
    const addColumn = async (tableName: string, columnName: string, definition: string) => {
        if (!tables.has(tableName)) {
            return;
        }

        const columns = await getColumnNames(tableName);
        if (!columns.has(columnName)) {
            statements.push(`ALTER TABLE \"${tableName}\" ADD \"${columnName}\" ${definition}`);
        }
    };

    statements.push(`CREATE TABLE IF NOT EXISTS "uploads" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" text,
        "folder_id" text,
        "file_path" text,
        "privacy_flag" text,
        "size" integer DEFAULT 0,
        "created_at" text DEFAULT (current_timestamp) NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "userSettings" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" text,
        "color_mode" text DEFAULT 'light',
        "search_visible" text DEFAULT 'true',
        "avatar_path" text,
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "folders" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" text,
        "parent_id" text,
        "name" text NOT NULL,
        "icon_path" text,
        "created_at" text DEFAULT (current_timestamp) NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "folderPublicShares" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "folder_id" text,
        "user_id" text,
        "token" text NOT NULL,
        "password_hash" text,
        "expires_at" text,
        "created_at" text DEFAULT (current_timestamp) NOT NULL,
        FOREIGN KEY ("folder_id") REFERENCES "folders"("id"),
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "folderUserShares" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "folder_id" text,
        "owner_id" text,
        "shared_with_user_id" text,
        "role" text DEFAULT 'member',
        "created_at" text DEFAULT (current_timestamp) NOT NULL,
        FOREIGN KEY ("folder_id") REFERENCES "folders"("id"),
        FOREIGN KEY ("owner_id") REFERENCES "users"("id"),
        FOREIGN KEY ("shared_with_user_id") REFERENCES "users"("id")
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "folderPublishedShares" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "folder_id" text,
        "user_id" text,
        "token" text NOT NULL,
        "markdown" text DEFAULT '',
        "likes" integer DEFAULT 0,
        "created_at" text DEFAULT (current_timestamp) NOT NULL,
        FOREIGN KEY ("folder_id") REFERENCES "folders"("id"),
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "ipBlacklist" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "ip_address" text NOT NULL,
        "reason" text DEFAULT 'captcha_failed' NOT NULL,
        "created_at" text DEFAULT (current_timestamp) NOT NULL
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "hiddenSharedStorageFolders" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" text,
        "folder_id" text,
        "created_at" text DEFAULT (current_timestamp) NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        FOREIGN KEY ("folder_id") REFERENCES "folders"("id")
    )`);
    statements.push(`CREATE TABLE IF NOT EXISTS "apiKeys" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" text NOT NULL,
        "name" text NOT NULL,
        "key_prefix" text NOT NULL,
        "key_hash" text NOT NULL,
        "last_used_at" text,
        "revoked_at" text,
        "created_at" text DEFAULT (current_timestamp) NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
    )`);

    await addColumn("users", "role", "text DEFAULT 'user' NOT NULL");
    await addColumn("users", "storage_max_bytes", "integer DEFAULT 13000000000 NOT NULL");
    await addColumn("uploads", "folder_id", "text REFERENCES folders(id)");
    await addColumn("userSettings", "search_visible", "text DEFAULT 'true'");
    await addColumn("userSettings", "avatar_path", "text");
    await addColumn("folders", "parent_id", "text");
    await addColumn("folders", "icon_path", "text");
    await addColumn("folderPublicShares", "expires_at", "text");
    await addColumn("folderPublicShares", "password_hash", "text");
    await addColumn("folderUserShares", "role", "text DEFAULT 'member'");

    statements.push("CREATE UNIQUE INDEX IF NOT EXISTS \"apiKeys_key_hash_unique\" ON \"apiKeys\" (\"key_hash\")");
    statements.push("UPDATE \"folderPublicShares\" SET \"expires_at\" = NULL WHERE \"expires_at\" IS NOT NULL");
    statements.push(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        "id" SERIAL PRIMARY KEY,
        "hash" text NOT NULL,
        "created_at" numeric
    )`);

    const baseline = readMigrationFiles({ migrationsFolder })
        .find((migration) => migration.folderMillis === legacyBaselineTimestamp);

    if (!baseline) {
        throw new Error("Could not find the legacy compatibility migration baseline");
    }

    statements.push({
        sql: `INSERT INTO "__drizzle_migrations" ("hash", "created_at")
              SELECT ?, ? WHERE NOT EXISTS (
                  SELECT 1 FROM "__drizzle_migrations" WHERE "created_at" >= ?
              )`,
        args: [baseline.hash, legacyBaselineTimestamp, legacyBaselineTimestamp]
    });

    await client.batch(statements, "write");
    return true;
}

try {
    const reconciled = await reconcileLegacyDatabase();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    console.log(reconciled
        ? "Legacy database reconciled; migrations are up to date."
        : "Database migrations are up to date.");
} finally {
    client.close();
}
