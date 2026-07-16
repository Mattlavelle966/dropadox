import { eq } from "drizzle-orm";
import { folderPublicShares, folderPublishedShares } from "~~/server/database/schema";

export function publicFolderShareCookieName(token: string) {
    return `folder_share_${token.replace(/[^a-zA-Z0-9-]/g, "")}`;
}

export async function getPublicFolderShare(db: any, token: string, event?: any) {
    const publicShare = await db.select().from(folderPublicShares)
        .where(eq(folderPublicShares.token, token))
        .get();

    if (publicShare?.folderId) {
        if (publicShare.passwordHash && (!event || getCookie(event, publicFolderShareCookieName(token)) !== publicShare.passwordHash)) {
            throw createError({ statusCode: 401, statusMessage: "Password required" });
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
