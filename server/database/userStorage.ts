import { uploads } from "./schema";
import fs from "fs";
import { eq } from "drizzle-orm";
import { useDrizzle } from "../utils/useDrizzle";

export async function getUserStorageBytes(userId: string) {
  const db = useDrizzle();

  const userUploads = await db.select().from(uploads)
    .where(eq(uploads.userId, userId));

  let total = 0;
  const countedPaths = new Set<string>();

  for (const upload of userUploads) {
    if (!upload.filePath || !fs.existsSync(upload.filePath)) {
      await db.delete(uploads).where(eq(uploads.id, upload.id));
      continue;
    }

    if (countedPaths.has(upload.filePath)) {
      continue;
    }

    countedPaths.add(upload.filePath);
    total += upload.size ?? 0;
  }

  return total;
}
