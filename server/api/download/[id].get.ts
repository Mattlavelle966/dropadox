import { defineEventHandler, sendStream, createError } from "h3";
import fs from "fs";
import { and, eq } from "drizzle-orm";
import { folderUserShares, uploads } from "../../database/schema";
import { setDownloadHeaders } from "../../utils/fileStorage";

export default defineEventHandler(async (event) => {
  const { id } = event.context.params as { id: string };
  const userPayload = getAuthenticatedUserPayload(event);
  const userId = String(userPayload.id);

  const db = useDrizzle();

  // 1) Lookup upload by ID
  const record = await db
    .select()
    .from(uploads)
    .where(eq(uploads.id, Number(id)))
    .get();

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: "Upload record not found"
    });
  }
  if (!record.filePath) {
    throw createError({
      statusCode: 404,
      statusMessage: "File path missing in database"
    });
  }

  const isOwner = record.userId === userId;
  const isSharedWithUser = record.folderId
    ? await db.select().from(folderUserShares)
      .where(and(
        eq(folderUserShares.folderId, record.folderId),
        eq(folderUserShares.sharedWithUserId, userId)
      ))
      .get()
    : null;

  if (!isOwner && !isSharedWithUser) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not allowed"
    });
  }

  // 2) Build file path from DB

  if (!fs.existsSync(record.filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: "File not found on disk"
    });
  }

  // 3) Stream file
  setDownloadHeaders(event, record.filePath);
  const stream = fs.createReadStream(record.filePath);
  return sendStream(event, stream);
});
