import fs from "fs";
import { and, eq, ne } from "drizzle-orm";
import { uploads } from "~~/server/database/schema";

export async function removeUploadReference(db: any, upload: typeof uploads.$inferSelect) {
    await db.delete(uploads).where(eq(uploads.id, upload.id));

    if (!upload.filePath) {
        return;
    }

    const remainingReference = await db.select({ id: uploads.id }).from(uploads)
        .where(eq(uploads.filePath, upload.filePath))
        .get();

    if (!remainingReference && fs.existsSync(upload.filePath)) {
        fs.unlinkSync(upload.filePath);
    }
}

export async function hasOtherUploadReference(db: any, upload: typeof uploads.$inferSelect) {
    if (!upload.filePath) {
        return false;
    }

    const otherReference = await db.select({ id: uploads.id }).from(uploads)
        .where(and(
            eq(uploads.filePath, upload.filePath),
            ne(uploads.id, upload.id)
        ))
        .get();

    return Boolean(otherReference);
}
