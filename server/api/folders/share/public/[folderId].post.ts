import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { folderPublicShares } from "~~/server/database/schema";

function createExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    return expiresAt.toISOString();
}

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "folder-public-share", 30, 60_000);
    const folderId = Number(getRouterParam(event, "folderId"));

    if (!Number.isInteger(folderId)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid folder id" });
    }

    const userPayload = getAuthenticatedUserPayload(event);
    const userId = String(userPayload.id);
    const body = await readBody(event).catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password.trim() : "";
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const db = useDrizzle();

    const folderAccess = await getFolderAccess(db, String(folderId), userId);

    if (!folderAccess?.isOwner) {
        throw createError({ statusCode: 404, statusMessage: "Folder not found" });
    }

    let share = await db.select().from(folderPublicShares)
        .where(eq(folderPublicShares.folderId, String(folderId)))
        .get();

    if (!share) {
        share = await db.insert(folderPublicShares).values({
            folderId: String(folderId),
            userId: String(folderAccess.folder.userId),
            token: crypto.randomUUID(),
            passwordHash,
            expiresAt: createExpiry()
        }).returning().get();
    } else if (!share.expiresAt || share.passwordHash !== passwordHash) {
        share = await db.update(folderPublicShares)
            .set({
                expiresAt: share.expiresAt ? share.expiresAt : createExpiry(),
                passwordHash
            })
            .where(eq(folderPublicShares.id, share.id))
            .returning()
            .get();
    }

    return {
        token: share.token,
        hasPassword: Boolean(share.passwordHash),
        url: `/share/folder/${share.token}`
    };
});
