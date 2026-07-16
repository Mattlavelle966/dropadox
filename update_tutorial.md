# DropaDox Update Tutorial

This guide is for an admin updating an existing DropaDox install, especially one with an older SQLite database.

## 1. Stop the running app

Stop the process manager, Docker container, or terminal session that is running DropaDox.

Examples:

```bash
# Docker Compose
docker compose down

# PM2, if used
pm2 stop dropadox
```

## 2. Back up the database and uploads

DropaDox reads the database location from `DB_FILE_NAME` in `.env`. The default local database is `file:local.db`.

```bash
cp local.db "local.db.backup.$(date +%Y%m%d%H%M%S)"
tar -czf "uploads.backup.$(date +%Y%m%d%H%M%S).tar.gz" uploads
```

Do not continue until the backup files exist.

## 3. Update the application files

```bash
git fetch --all
git pull
npm ci
```

If the install was changed manually instead of using Git, copy the new release over the old install while keeping `.env`, `local.db`, and `uploads`.

## 4. Apply database migrations

Load the same environment file the production app uses, then run Drizzle migrations.

```bash
set -a
. ./.env
set +a
npm run db:migrate
```

If the database is outdated, this applies the missing files in `server/database/migrations`.

## 5. Check for old-database issues

If migration fails with a message like `duplicate column name`, the database probably already has that column but does not have a matching Drizzle migration record. Confirm the current schema before changing anything:

```bash
sqlite3 local.db ".tables"
sqlite3 local.db "PRAGMA table_info(users);"
sqlite3 local.db "PRAGMA table_info(folders);"
sqlite3 local.db "PRAGMA table_info(uploads);"
sqlite3 local.db "PRAGMA table_info(folderUserShares);"
```

Compare the output with the migration files in `server/database/migrations`. If the column/table already exists and the app was previously updated manually, keep the backup and repair the migration history only after confirming which migration was already applied.

For versions that predate per-user storage limits, make sure `users` has `storage_max_bytes`. If migration history is missing but the older tables already exist, apply this one schema change after backing up:

```sql
ALTER TABLE users ADD COLUMN storage_max_bytes integer DEFAULT 13000000000 NOT NULL;
UPDATE users SET storage_max_bytes = 13000000000 WHERE storage_max_bytes IS NULL OR storage_max_bytes <= 0;
```

When in doubt, restore the backup and ask a maintainer to review the exact migration error.

## 6. Build and smoke test

```bash
npm run build
PORT=3001 HOST=0.0.0.0 node .output/server/index.mjs
```

In a second terminal:

```bash
curl -i http://127.0.0.1:3001/
curl -i -X POST http://127.0.0.1:3001/api/verifyToken
curl -i http://127.0.0.1:3001/api/storage
```

Expected results:

- `/` returns `200`.
- `/api/verifyToken` returns JSON.
- `/api/storage` returns JSON instead of a database error.

## 7. Restart production

Use the same port and environment variables your deployment expects.

```bash
set -a
. ./.env
set +a
PORT=3001 HOST=0.0.0.0 NODE_ENV=production node .output/server/index.mjs
```

For Docker Compose, update the port mapping if needed, then start it again:

```bash
docker compose up -d --build
```

The provided Compose command now applies pending migrations before each production build. Migrations are tracked and only run once, so existing users, files, folders, and public-link tokens are preserved.

## Rollback

If the new version does not start:

1. Stop the app.
2. Restore the previous code version.
3. Restore the database backup:

```bash
cp local.db.backup.YYYYMMDDHHMMSS local.db
```

4. Restore uploads if needed:

```bash
rm -rf uploads
tar -xzf uploads.backup.YYYYMMDDHHMMSS.tar.gz
```

5. Start the previous version again.
