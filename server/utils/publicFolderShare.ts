import { eq } from "drizzle-orm";
import { folderPublicShares, folderPublishedShares } from "~~/server/database/schema";

export async function getPublicFolderShare(db: any, token: string) {
    const publicShare = await db.select().from(folderPublicShares)
        .where(eq(folderPublicShares.token, token))
        .get();

    if (publicShare?.folderId) {
        if (publicShare.expiresAt && new Date(publicShare.expiresAt).getTime() <= Date.now()) {
            throw createError({ statusCode: 410, statusMessage: "Share link expired" });
        }

        return {
            folderId: publicShare.folderId,
            token: publicShare.token,
            type: "public" as const
        };
    }

    const publishedShare = await db.select().from(folderPublishedShares)
        .where(eq(folderPublishedShares.token, token))
        .get();

    if (publishedShare?.folderId) {
        return {
            folderId: publishedShare.folderId,
            token: publishedShare.token,
            type: "published" as const
        };
    }

    throw createError({ statusCode: 404, statusMessage: "Share not found" });
}
