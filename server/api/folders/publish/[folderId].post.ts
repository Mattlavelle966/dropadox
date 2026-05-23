import { eq } from "drizzle-orm";
import { folderPublishedShares } from "~~/server/database/schema";

function cleanMarkdown(markdown: unknown) {
    return String(markdown ?? "").trim().slice(0, 4000);
}

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-publish", 30, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));
    const { markdown } = await readBody(event);

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), userId);

    if (!folderAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    const description = cleanMarkdown(markdown);
    let published = await db.select().from(folderPublishedShares)
        .where(eq(folderPublishedShares.folderId, String(folderId)))
        .get();

    if (published) {
        published = await db.update(folderPublishedShares)
            .set({ markdown: description })
            .where(eq(folderPublishedShares.id, published.id))
            .returning()
            .get();
    } else {
        published = await db.insert(folderPublishedShares)
            .values({
                folderId: String(folderId),
                userId: String(folderAccess.folder.userId),
                token: crypto.randomUUID(),
                markdown: description,
                likes: 0
            })
            .returning()
            .get();
    }

    return {
        published: true,
        share: {
            token: published.token,
            url: `/share/folder/${published.token}`,
            markdown: published.markdown ?? "",
            likes: published.likes ?? 0
        }
    };
});
